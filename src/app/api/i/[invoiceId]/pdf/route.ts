import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { invoices, tenants, settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateInvoicePdf } from '@/lib/services/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
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
      })
      .from(invoices)
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
      .leftJoin(settings, eq(invoices.tenantId, settings.tenantId))
      .where(eq(invoices.invoiceNumber, invoiceId))

    if (!row) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    const inv = row.invoice
    const storeName = row.storeName || row.tenantName || 'Store'

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
      }
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${inv.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
