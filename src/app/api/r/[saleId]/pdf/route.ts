import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { sales, tenants, settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateSaleReceiptPdf } from '@/lib/services/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { saleId } = await params
    const db = await dbConnect()

    const [row] = await db
      .select({
        sale: sales,
        tenantName: tenants.name,
        storeName: settings.storeName,
        storePhone: settings.storePhone,
        storeEmail: settings.storeEmail,
        storeAddress: settings.storeAddress,
        receiptFooter: settings.receiptFooter,
      })
      .from(sales)
      .leftJoin(tenants, eq(sales.tenantId, tenants.id))
      .leftJoin(settings, eq(sales.tenantId, settings.tenantId))
      .where(eq(sales.saleNumber, saleId))

    if (!row) {
      return new NextResponse('Sale not found', { status: 404 })
    }

    const s = row.sale
    const storeName = row.storeName || row.tenantName || 'Store'

    const pdfBuffer = await generateSaleReceiptPdf(
      {
        saleNumber: s.saleNumber,
        customerName: s.customerName || undefined,
        customerPhone: s.customerPhone || undefined,
        items: s.items as Array<{ name: string; quantity: number; price: number; subtotal: number }>,
        subtotal: s.subtotal,
        discount: s.discount,
        tax: s.tax,
        total: s.total,
        paymentMethod: s.paymentMethod,
        notes: s.notes || undefined,
        createdAt: s.createdAt,
      },
      {
        name: storeName,
        phone: row.storePhone || undefined,
        email: row.storeEmail || undefined,
        address: row.storeAddress || undefined,
        footer: row.receiptFooter || undefined,
      }
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${s.saleNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
