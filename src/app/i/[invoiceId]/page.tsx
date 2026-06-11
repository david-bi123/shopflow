import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Store, ArrowLeft, MapPin, Phone, Mail, Calendar, FileText, User, CircleCheck, CircleAlert, CircleDashed, CircleX } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getInvoiceByNumber } from '@/lib/actions/invoice-actions'
import { PublicActions } from '@/components/shared/public-actions'

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string; bgClass: string }
> = {
  paid: {
    label: 'Paid',
    icon: CircleCheck,
    className: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-50 ring-emerald-200/60 dark:bg-emerald-950/60 dark:ring-emerald-800/40',
  },
  sent: {
    label: 'Sent',
    icon: CircleAlert,
    className: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 ring-blue-200/60 dark:bg-blue-950/60 dark:ring-blue-800/40',
  },
  draft: {
    label: 'Draft',
    icon: CircleDashed,
    className: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/40',
  },
  overdue: {
    label: 'Overdue',
    icon: CircleAlert,
    className: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 ring-red-200/60 dark:bg-red-950/60 dark:ring-red-800/40',
  },
  cancelled: {
    label: 'Cancelled',
    icon: CircleX,
    className: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/40',
  },
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

  const currency = invoice.currency ?? 'GHS'
  const tenant = invoice.tenant ?? { id: '', name: 'Store', slug: '' }
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/i/${invoice.invoiceNumber}`
  const pdfUrl = `/api/i/${invoice.invoiceNumber}/pdf`
  const whatsappMessage = encodeURIComponent(
    `Invoice ${invoice.invoiceNumber} - Total: ${formatCurrency(invoice.total, currency)}`
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}%0A${invoiceUrl}`

  const status = statusConfig[invoice.status] ?? statusConfig.draft
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-6 dark:from-black dark:via-zinc-950 dark:to-blue-950/20 sm:py-12 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-5 flex items-center justify-between print:hidden sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-all hover:bg-white hover:text-foreground hover:shadow dark:bg-zinc-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <PublicActions pdfUrl={pdfUrl} pageUrl={invoiceUrl} whatsappUrl={whatsappUrl} />
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-xl shadow-slate-200/50 dark:bg-card dark:shadow-black/20 print:shadow-none print:border-0 print:rounded-none"
          id="invoice"
        >
          <div className="relative bg-gradient-to-br from-slate-50/80 via-white to-white px-5 py-7 sm:px-10 sm:py-8 dark:from-zinc-900/50 dark:via-card dark:to-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{tenant.name}</h1>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {tenant.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{tenant.address}</span>
                    </div>
                  )}
                  {tenant.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{tenant.phone}</span>
                    </div>
                  )}
                  {tenant.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{tenant.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Invoice
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  #{invoice.invoiceNumber}
                </h2>
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.bgClass} ${status.className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border-y border-border/60 bg-border/40 sm:grid-cols-2">
            <div className="bg-white px-5 py-4 dark:bg-card sm:px-6 sm:py-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3 w-3" />
                Bill To
              </div>
              <p className="text-base font-semibold text-foreground">{invoice.customerName}</p>
              <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
                {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                {invoice.customerAddress && <p className="max-w-xs">{invoice.customerAddress}</p>}
              </div>
            </div>
            <div className="bg-white px-5 py-4 dark:bg-card sm:px-6 sm:py-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Dates
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatDate(invoice.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-10 sm:py-6">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" />
              Items
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="hidden border-b border-border/60 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-12 sm:px-4 sm:py-2.5 dark:bg-zinc-900/50">
                <div className="sm:col-span-6">Item</div>
                <div className="text-right sm:col-span-2">Quantity</div>
                <div className="text-right sm:col-span-2">Unit Price</div>
                <div className="text-right sm:col-span-2">Total</div>
              </div>
              <div className="divide-y divide-border/60">
                {invoice.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-sm transition-colors hover:bg-slate-50/40 sm:px-4 sm:py-3.5 dark:hover:bg-zinc-900/30"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="col-span-4 text-right tabular-nums text-muted-foreground sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-wider sm:hidden">Qty </span>
                      {item.quantity}
                    </div>
                    <div className="col-span-4 text-right tabular-nums text-muted-foreground sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-wider sm:hidden">Price </span>
                      {formatCurrency(item.price, currency)}
                    </div>
                    <div className="col-span-4 text-right tabular-nums font-semibold text-foreground sm:col-span-2">
                      <span className="text-[10px] uppercase tracking-wider sm:hidden">Total </span>
                      {formatCurrency(item.total, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-border/60 bg-slate-50/40 px-5 py-4 dark:bg-zinc-900/30 sm:px-10 sm:py-5">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(invoice.subtotal, currency)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                    −{formatCurrency(invoice.discount, currency)}
                  </span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(invoice.tax, currency)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border/60 pt-2.5">
                <span className="text-sm font-semibold text-foreground">Total Due</span>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(invoice.total, currency)}
                </span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t border-border/60 bg-amber-50/30 px-5 py-4 sm:px-10 dark:bg-amber-950/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 text-sm italic text-foreground">{invoice.notes}</p>
            </div>
          )}

          <div className="border-t border-border/60 bg-gradient-to-b from-white to-slate-50/50 px-5 py-5 dark:from-card dark:to-zinc-900/30 sm:px-10 sm:py-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="order-2 text-center sm:order-1 sm:text-left">
                <p className="text-sm font-semibold text-foreground">
                  {invoice.receiptFooter || 'Thank you for your business!'}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Generated by {tenant.name} · Powered by IndFlow
                </p>
              </div>
              <div className="order-1 sm:order-2">
                <div className="rounded-xl border border-border/60 bg-white p-2.5 shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                    <svg viewBox="0 0 33 33" className="h-16 w-16 sm:h-20 sm:w-20">
                      <rect width="33" height="33" fill="white" />
                      <g fill="black">
                        {Array.from({ length: 9 }).map((_, row) =>
                          Array.from({ length: 9 }).map((_, col) => {
                            if ((row + col) % 3 === 0 || row === 4 || col === 4)
                              return (
                                <rect key={`${row}-${col}`} x={col * 3 + 3} y={row * 3 + 3} width={3} height={3} />
                              )
                            return null
                          })
                        )}
                      </g>
                    </svg>
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Scan to verify
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
