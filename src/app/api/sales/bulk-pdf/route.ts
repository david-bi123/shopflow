import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { sales, tenants, settings, debtLedger } from '@/lib/db/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { generateMultiSaleReceiptPdf } from '@/lib/services/pdf'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { toNum } from '@/lib/db/helpers'
import { getCurrencySymbol } from '@/lib/utils/constants'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rate-limit'
import type { SalePdfData, StoreInfo } from '@/lib/services/pdf'

const MAX_SALES_PER_PDF = 500

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.user.role, PERMISSIONS.sales.read)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = getClientIp(req.headers)
  const rl = rateLimit(`bulk-pdf:${ip}`, { limit: 20, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl)

  let ids: number[]
  try {
    const body = (await req.json()) as { ids?: unknown }
    if (!Array.isArray(body.ids)) throw new Error('invalid body')
    ids = body.ids.map((id) => toNum(id)).filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No sales selected' }, { status: 400 })
  }
  if (ids.length > MAX_SALES_PER_PDF) {
    return NextResponse.json(
      { error: `Select at most ${MAX_SALES_PER_PDF} sales per PDF` },
      { status: 400 },
    )
  }

  const tenantId = toNum(session.user.tenantId)

  try {
    const db = await dbConnect()

    const rows = await db
      .select({
        sale: sales,
        tenantName: tenants.name,
        storeName: settings.storeName,
        storePhone: settings.storePhone,
        storeEmail: settings.storeEmail,
        storeAddress: settings.storeAddress,
        storeDescription: settings.storeDescription,
        taxNumber: settings.taxNumber,
        receiptFooter: settings.receiptFooter,
        currency: settings.currency,
      })
      .from(sales)
      .leftJoin(tenants, eq(sales.tenantId, tenants.id))
      .leftJoin(settings, eq(sales.tenantId, settings.tenantId))
      .where(and(eq(sales.tenantId, tenantId), inArray(sales.id, ids)))
      .orderBy(asc(sales.createdAt), asc(sales.id))

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No sales found' }, { status: 404 })
    }

    const storeRow = rows[0]
    const store: StoreInfo = {
      name: storeRow.storeName || storeRow.tenantName || 'Store',
      description: storeRow.storeDescription || undefined,
      phone: storeRow.storePhone || undefined,
      email: storeRow.storeEmail || undefined,
      address: storeRow.storeAddress || undefined,
      taxNumber: storeRow.taxNumber || undefined,
      footer: storeRow.receiptFooter || undefined,
      currency: storeRow.currency || 'GHS',
      currencySymbol: getCurrencySymbol(storeRow.currency),
    }

    // Payment history for every selected sale in one query, grouped by sale.
    const saleIds = rows.map((r) => r.sale.id)
    const history = await db
      .select({
        referenceId: debtLedger.referenceId,
        type: debtLedger.type,
        amount: debtLedger.amount,
        notes: debtLedger.notes,
        createdAt: debtLedger.createdAt,
      })
      .from(debtLedger)
      .where(and(
        eq(debtLedger.tenantId, tenantId),
        eq(debtLedger.referenceType, 'sale'),
        inArray(debtLedger.referenceId, saleIds),
      ))
      .orderBy(asc(debtLedger.createdAt), asc(debtLedger.id))

    const historyBySale = new Map<number, typeof history>()
    for (const h of history) {
      if (h.referenceId == null) continue
      const list = historyBySale.get(h.referenceId) ?? []
      list.push(h)
      historyBySale.set(h.referenceId, list)
    }

    const pdfSales: SalePdfData[] = rows.map((r) => {
      const s = r.sale
      return {
        saleNumber: s.saleNumber,
        customerName: s.customerName || undefined,
        customerPhone: s.customerPhone || undefined,
        waybillNo: s.waybillNo || undefined,
        companyRefNo: s.companyRefNo || undefined,
        carNo: s.carNo || undefined,
        saleDate: s.saleDate || undefined,
        items: s.items as Array<{ name: string; quantity: number; price: number; subtotal: number }>,
        subtotal: s.subtotal,
        discountPercent: s.discountPercent,
        discount: s.discount,
        tax: s.tax,
        taxItems: (s.taxItems as Array<{ name: string; rate: number; amount: number }>) ?? [],
        total: s.total,
        amountPaid: s.amountPaid,
        amountOwed: s.amountOwed,
        notes: s.notes || undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        paymentHistory: (historyBySale.get(s.id) ?? []).map((h) => ({
          type: h.type,
          amount: h.amount,
          notes: h.notes ?? undefined,
          createdAt: h.createdAt,
        })),
      }
    })

    const pdfBuffer = await generateMultiSaleReceiptPdf(pdfSales, store)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoices-bulk-${rows.length}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Bulk PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}