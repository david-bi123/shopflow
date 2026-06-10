import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Store, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getSaleByNumber } from '@/lib/actions/sale-actions'
import { PublicActions } from '@/components/shared/public-actions'

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>
}) {
  const { saleId } = await params
  const sale = await getSaleByNumber(saleId)

  if (!sale) {
    notFound()
  }

  const store = (sale.tenantId as any) || { name: 'Store', slug: '' }
  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${sale.saleNumber}`
  const pdfUrl = `/api/r/${sale.saleNumber}/pdf`
  const whatsappMessage = `Sale ${sale.saleNumber} - ${sale.customerName || 'Customer'} - Total: ${formatCurrency(sale.total)}`
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}%0A${receiptUrl}`

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-black">
      <div className="mx-auto max-w-md px-4">
        {/* Actions */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <PublicActions
            pdfUrl={pdfUrl}
            pageUrl={receiptUrl}
            whatsappUrl={whatsappUrl}
            label="Receipt"
          />
        </div>

        {/* Receipt */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-card print:shadow-none" id="receipt">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-2 flex justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-lg font-bold">{store.name}</h1>
          </div>

          <div className="mb-4 border-b pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receipt #</span>
              <span className="font-medium">{sale.saleNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(sale.createdAt)}</span>
            </div>
            {sale.customerName && (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium">{sale.customerName}</p>
                {sale.customerPhone && (
                  <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Price</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Paid via {sale.paymentMethod}
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="mt-4 border-t pt-3 text-center text-sm text-muted-foreground">
              {sale.notes}
            </div>
          )}

          {/* QR Code */}
          <div className="mt-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-gray-50">
                      <svg viewBox="0 0 33 33" className="h-16 w-16">
                        <rect width="33" height="33" fill="white" />
                        <g fill="black">
                          {Array.from({ length: 9 }).map((_, row) =>
                            Array.from({ length: 9 }).map((_, col) => {
                              if ((row + col) % 3 === 0 || (row === 4 || col === 4))
                                return (
                                  <rect
                                    key={`${row}-${col}`}
                                    x={col * 3 + 3}
                                    y={row * 3 + 3}
                                    width={3}
                                    height={3}
                                  />
                                )
                              return null
                            })
                          )}
                        </g>
                      </svg>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 border-t pt-3 text-center text-xs text-muted-foreground">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
