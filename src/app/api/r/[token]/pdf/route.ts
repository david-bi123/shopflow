import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { sales, tenants, settings, debtLedger } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { generateSaleReceiptPdf } from '@/lib/services/pdf'
import { verifyPublicToken } from '@/lib/services/public-token'
import { getCurrencySymbol } from '@/lib/utils/constants'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Cap at 30 PDF generations / minute / IP. PDFKit is heavy and
  // unlimited scraping of a leaked token would burn CPU.
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`pdf-sale:${ip}`, { limit: 30, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const { token } = await params
    const payload = verifyPublicToken(token)
    if (!payload || payload.t !== 's') {
      return new NextResponse('Not found', { status: 404 })
    }

    const db = await dbConnect()
    const [row] = await db
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
      .where(and(eq(sales.id, payload.id), eq(sales.tenantId, payload.tn)))

    if (!row) {
      return new NextResponse('Not found', { status: 404 })
    }

    const s = row.sale
    const storeName = row.storeName || row.tenantName || 'Store'
    const currencyCode = row.currency || 'GHS'

    const history = await db
      .select({
        type: debtLedger.type,
        amount: debtLedger.amount,
        notes: debtLedger.notes,
        createdAt: debtLedger.createdAt,
      })
      .from(debtLedger)
      .where(and(
        eq(debtLedger.tenantId, payload.tn),
        eq(debtLedger.referenceType, 'sale'),
        eq(debtLedger.referenceId, payload.id),
      ))
      .orderBy(asc(debtLedger.createdAt), asc(debtLedger.id))

    const pdfBuffer = await generateSaleReceiptPdf(
      {
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
        paymentMethod: s.paymentMethod,
        notes: s.notes || undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        paymentHistory: history.map((h) => ({
          type: h.type,
          amount: h.amount,
          notes: h.notes ?? undefined,
          createdAt: h.createdAt,
        })),
      },
      {
        name: storeName,
        description: row.storeDescription || undefined,
        phone: row.storePhone || undefined,
        email: row.storeEmail || undefined,
        address: row.storeAddress || undefined,
        taxNumber: row.taxNumber || undefined,
        footer: row.receiptFooter || undefined,
        currency: currencyCode,
        currencySymbol: getCurrencySymbol(currencyCode),
      }
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${s.saleNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
