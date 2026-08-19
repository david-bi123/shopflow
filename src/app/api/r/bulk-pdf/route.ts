import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { sales, tenants, settings, debtLedger } from '@/lib/db/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { generateMultiSaleReceiptPdf } from '@/lib/services/pdf'
import { verifyPublicToken } from '@/lib/services/public-token'
import { getCurrencySymbol } from '@/lib/utils/constants'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rate-limit'
import type { SalePdfData, StoreInfo } from '@/lib/services/pdf'

const MAX_INVOICES_PER_PDF = 500

/**
 * Public combined PDF: every invoice identified by the `tokens` query
 * param (comma-separated public sale tokens) rendered as one PDF, one
 * receipt per A4 page. This powers the "Download PDF" button on the
 * combined `/r/bulk?tokens=...` page.
 */
export async function GET(req: NextRequest) {
  // PDFKit is heavy — cap generation per IP.
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`pdf-sale-bulk:${ip}`, { limit: 20, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const url = new URL(req.url)
    const raw = url.searchParams.get('tokens') ?? ''
    const tokens = [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))]

    if (tokens.length === 0) {
      return new NextResponse('No invoices selected', { status: 400 })
    }
    if (tokens.length > MAX_INVOICES_PER_PDF) {
      return new NextResponse(`Select at most ${MAX_INVOICES_PER_PDF} invoices`, { status: 400 })
    }

    const payloads = tokens
      .map((t) => verifyPublicToken(t))
      .filter((p): p is { t: 's'; tn: number; id: number } => !!p && p.t === 's')
    if (payloads.length === 0) {
      return new NextResponse('Not found', { status: 404 })
    }

    // A combined PDF carries a single store header, so require all the
    // invoices to belong to the same tenant.
    const tenantId = payloads[0].tn
    if (!payloads.every((p) => p.tn === tenantId)) {
      return new NextResponse('Invoices must belong to the same store', { status: 400 })
    }
    const ids = payloads.map((p) => p.id)

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
      return new NextResponse('Not found', { status: 404 })
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
    console.error('Bulk public PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}