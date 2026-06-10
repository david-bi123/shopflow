import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Store, ArrowLeft, MapPin } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getInvoiceByNumber } from '@/lib/actions/invoice-actions'
import { PublicActions } from '@/components/shared/public-actions'

const statusColors: Record<string, string> = {
  paid: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
  sent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  draft: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950',
  overdue: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  cancelled: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950',
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  const invoice = await getInvoiceByNumber(invoiceId)

  if (!invoice) {
    notFound()
  }

  const store = (invoice.tenantId || { name: 'Store', slug: '', address: '' }) as { name: string; slug: string; address?: string }
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/i/${invoice.invoiceNumber}`
  const pdfUrl = `/api/i/${invoice.invoiceNumber}/pdf`
  const whatsappMessage = encodeURIComponent(
    `Invoice ${invoice.invoiceNumber} - Total: ${formatCurrency(invoice.total)}`
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}%0A${invoiceUrl}`

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-black">
      <div className="mx-auto max-w-3xl px-4">
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
            pageUrl={invoiceUrl}
            whatsappUrl={whatsappUrl}
            label="Invoice"
          />
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm dark:bg-card print:shadow-none" id="invoice">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">{store.name}</h1>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {store.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{store.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold tracking-tight">INVOICE</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                #{invoice.invoiceNumber}
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  statusColors[invoice.status] ?? 'bg-gray-50 text-gray-600'
                }`}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Bill To</h3>
              <p className="font-medium">{invoice.customerName}</p>
              {invoice.customerEmail && (
                <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>
              )}
              {invoice.customerPhone && (
                <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
              )}
              {invoice.customerAddress && (
                <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>
              )}
            </div>
            <div className="space-y-1 text-right sm:text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Date</span>
                <span>{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>

          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left">
                <th className="py-3 pl-4 font-medium">Item</th>
                <th className="py-3 text-right font-medium">Quantity</th>
                <th className="py-3 text-right font-medium">Unit Price</th>
                <th className="py-3 pr-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3 pl-4">{item.name}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-3 pr-4 text-right font-medium">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-full max-w-xs space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-1 text-sm font-medium text-muted-foreground">Notes</h4>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-gray-50">
              <svg viewBox="0 0 33 33" className="h-20 w-20">
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

          <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
