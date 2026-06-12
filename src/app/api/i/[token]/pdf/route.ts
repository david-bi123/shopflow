import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { invoices, tenants, settings } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { generateInvoicePdf } from '@/lib/services/pdf'
import { verifyPublicToken } from '@/lib/services/public-token'
import { getCurrencySymbol } from '@/lib/utils/constants'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`pdf-inv:${ip}`, { limit: 30, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const { token } = await params
    const payload = verifyPublicToken(token)
    if (!payload || payload.t !== 'i') {
      return new NextResponse('Not found', { status: 404 })
    }

    const db = await dbConnect()
    const [row] = await db
      .select({
        invoice: invoices,
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
      .from(invoices)
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
      .leftJoin(settings, eq(invoices.tenantId, settings.tenantId))
      .where(and(eq(invoices.id, payload.id), eq(invoices.tenantId, payload.tn)))

    if (!row) {
      return new NextResponse('Not found', { status: 404 })
    }

    const inv = row.invoice
    const storeName = row.storeName || row.tenantName || 'Store'
    const currencyCode = row.currency || 'GHS'

    const pdfBuffer = await generateInvoicePdf(
      {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail || undefined,
        customerPhone: inv.customerPhone || undefined,
        customerAddress: inv.customerAddress || undefined,
        items: inv.items as Array<{ name: string; description?: string; quantity: number; price: number; total: number }>,
        subtotal: inv.subtotal,
        discountPercent: inv.discountPercent,
        discount: inv.discount,
        tax: inv.tax,
        taxItems: (inv.taxItems as Array<{ name: string; rate: number; amount: number }>) ?? [],
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate,
        notes: inv.notes || undefined,
        createdAt: inv.createdAt,
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
        'Content-Disposition': `attachment; filename="invoice-${inv.invoiceNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
