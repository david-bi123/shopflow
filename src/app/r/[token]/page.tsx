import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Calendar,
  Hash,
  FileText,
  Phone,
  CreditCard,
  MapPin,
  Receipt,
  Wallet,
  ClipboardList,
} from 'lucide-react'
import { formatCurrency, formatDate, formatAmountInWords } from '@/lib/utils/format'
import { getSaleByPublicToken } from '@/lib/actions/sale-actions'
import { PublicActions } from '@/components/shared/public-actions'

type PaymentHistoryEntry = {
  id?: string | number
  type: string
  amount: number
  notes?: string | null
  balanceAfter?: number
  createdAt: string
}

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sale = (await getSaleByPublicToken(token)) as (Record<string, unknown> & {
    saleNumber: string
    customerName?: string | null
    customerPhone?: string | null
    customerEmail?: string | null
    items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
    subtotal: number
    discount: number
    tax: number
    total: number
    amountPaid: number
    amountOwed: number
    paymentMethod: string
    notes?: string | null
    createdAt: string
    updatedAt: string
    currency?: string
    discountPercent?: number
    taxItems?: Array<{ name: string; rate: number; amount: number }>
    paymentHistory?: PaymentHistoryEntry[]
    tenant?: {
      name: string
      slug: string
      phone?: string
      email?: string
      address?: string
      description?: string
      taxNumber?: string
    }
  }) | null

  if (!sale) {
    notFound()
  }

  const currency = sale.currency ?? 'GHS'
  const tenant = sale.tenant ?? { name: 'Store', slug: '' }

  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${token}`
  const pdfUrl = `/api/r/${token}/pdf`
  const whatsappMessage = `Receipt ${sale.saleNumber} - ${sale.customerName || 'Customer'} - Total: ${formatCurrency(sale.total, currency)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}%0A${receiptUrl}`

  const paymentMethodLabel = (sale.paymentMethod || 'cash')
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const owed = Math.max(0, Math.round((sale.amountOwed ?? 0) * 100) / 100)
  const paid = Math.max(0, Math.round((sale.amountPaid ?? 0) * 100) / 100)

  const status: 'paid' | 'partial' | 'unpaid' =
    owed <= 0.005 ? 'paid' : paid > 0.005 ? 'partial' : 'unpaid'

  const statusConfig = {
    paid: {
      label: 'Paid in Full',
      Icon: CheckCircle2,
      className: 'text-emerald-700 dark:text-emerald-300',
      bgClass: 'bg-emerald-50 ring-emerald-200/60 dark:bg-emerald-950/60 dark:ring-emerald-800/40',
    },
    partial: {
      label: 'Partially Paid',
      Icon: CircleDot,
      className: 'text-amber-700 dark:text-amber-300',
      bgClass: 'bg-amber-50 ring-amber-200/60 dark:bg-amber-950/60 dark:ring-amber-800/40',
    },
    unpaid: {
      label: 'Unpaid',
      Icon: AlertTriangle,
      className: 'text-red-700 dark:text-red-300',
      bgClass: 'bg-red-50 ring-red-200/60 dark:bg-red-950/60 dark:ring-red-800/40',
    },
  }[status]

  const StatusIcon = statusConfig.Icon

  const history = (sale.paymentHistory ?? []).filter((h) => h.type !== 'sale_created')
  const isUpdated = sale.updatedAt && sale.updatedAt !== sale.createdAt

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-6 dark:from-black dark:via-zinc-950 dark:to-emerald-950/20 sm:py-12 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-5 flex items-center justify-between print:hidden sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-all hover:bg-white hover:text-foreground hover:shadow dark:bg-zinc-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <PublicActions pdfUrl={pdfUrl} pageUrl={receiptUrl} whatsappUrl={whatsappUrl} />
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-xl shadow-slate-200/50 dark:bg-card dark:shadow-black/20 print:shadow-none print:border-0 print:rounded-none"
          id="receipt"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-50/80 via-white to-white px-5 py-7 sm:px-10 sm:py-8 dark:from-zinc-900/50 dark:via-card dark:to-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />

            {/* Store identity — name first on top, then address, phone, email (receipt-book style) */}
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-3 text-lg font-bold text-primary-foreground shadow-md shadow-primary/20">
                  {tenant.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w.charAt(0).toUpperCase())
                    .join('') || 'S'}
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{tenant.name}</h1>
              {tenant.description && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  {tenant.description}
                </p>
              )}
              <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                {tenant.address && (
                  <p className="flex items-center justify-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{tenant.address}</span>
                  </p>
                )}
                {tenant.phone && (
                  <p className="flex items-center justify-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{tenant.phone}</span>
                  </p>
                )}
                {tenant.email && <p>{tenant.email}</p>}
                {tenant.taxNumber && (
                  <p className="text-[11px] font-medium">Tax ID: {tenant.taxNumber}</p>
                )}
              </div>
            </div>

            {/* Receipt title */}
            <div className="mt-6 border-t border-dashed border-border/60 pt-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Receipt
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                #{sale.saleNumber}
              </h2>
              <div
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig.bgClass} ${statusConfig.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Customer + Date / Payment */}
          <div className="grid grid-cols-1 gap-px border-y border-border/60 bg-border/40 sm:grid-cols-2">
            <div className="bg-white px-5 py-4 dark:bg-card sm:px-6 sm:py-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Hash className="h-3 w-3" />
                Customer
              </div>
              <p className="text-base font-semibold text-foreground">
                {sale.customerName || 'Walk-in customer'}
              </p>
              <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {sale.customerPhone && <p>{sale.customerPhone}</p>}
                {sale.customerEmail && <p>{sale.customerEmail}</p>}
              </div>
            </div>
            <div className="bg-white px-5 py-4 dark:bg-card sm:px-6 sm:py-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Receipt Date
              </div>
              <p className="text-base font-semibold tabular-nums text-foreground">
                {formatDate(sale.createdAt, 'datetime')}
              </p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Payment method</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    <CreditCard className="h-3 w-3" />
                    {paymentMethodLabel}
                  </span>
                </div>
                {isUpdated && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Last updated</span>
                    <span className="text-xs font-medium tabular-nums text-foreground">
                      {formatDate(sale.updatedAt, 'long')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-5 sm:px-10 sm:py-6">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" />
              Items
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="grid grid-cols-12 gap-2 border-b border-border/60 bg-slate-50/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4 sm:py-2.5 dark:bg-zinc-900/50">
                <div className="col-span-12 sm:col-span-6">Item</div>
                <div className="col-span-4 text-right sm:col-span-2">Quantity</div>
                <div className="col-span-4 text-right sm:col-span-2">Unit Price</div>
                <div className="col-span-4 text-right sm:col-span-2">Total</div>
              </div>
              <div className="divide-y divide-border/60">
                {sale.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-sm transition-colors hover:bg-slate-50/40 sm:px-4 sm:py-3.5 dark:hover:bg-zinc-900/30"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <p className="font-medium text-foreground">{item.name}</p>
                    </div>
                    <div className="col-span-4 text-right tabular-nums text-muted-foreground sm:col-span-2">
                      {item.quantity}
                    </div>
                    <div className="col-span-4 text-right tabular-nums text-muted-foreground sm:col-span-2">
                      {formatCurrency(item.price, currency)}
                    </div>
                    <div className="col-span-4 text-right tabular-nums font-semibold text-foreground sm:col-span-2">
                      {formatCurrency(item.subtotal, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Totals + Payment Summary */}
          <div className="flex justify-end border-t border-border/60 bg-slate-50/40 px-5 py-4 dark:bg-zinc-900/30 sm:px-10 sm:py-5">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(sale.subtotal, currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Discount{(sale.discountPercent ?? 0) > 0 ? ` (${(sale.discountPercent ?? 0).toFixed(2)}%)` : ''}
                  </span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                    −{formatCurrency(sale.discount, currency)}
                  </span>
                </div>
              )}
              {sale.taxItems && sale.taxItems.length > 0 ? (
                sale.taxItems.map((t) => (
                  <div key={t.name} className="flex justify-between text-muted-foreground">
                    <span>
                      {t.name} <span className="text-[10px] text-muted-foreground/70">({t.rate}%)</span>
                    </span>
                    <span className="tabular-nums">{formatCurrency(t.amount, currency)}</span>
                  </div>
                ))
              ) : (
                sale.tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="tabular-nums">{formatCurrency(sale.tax, currency)}</span>
                  </div>
                )
              )}
              <div className="flex items-baseline justify-between border-t border-border/60 pt-2.5">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {formatCurrency(sale.total, currency)}
                </span>
              </div>

              <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-border/40 dark:bg-zinc-900/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount in words
                </p>
                <p className="mt-0.5 text-xs italic leading-relaxed text-foreground/80">
                  {formatAmountInWords(sale.total, currency)}
                </p>
              </div>

              {/* Payment Summary card */}
              <div
                className={`mt-3 overflow-hidden rounded-xl ring-1 ring-inset ${
                  status === 'paid'
                    ? 'bg-emerald-50/70 ring-emerald-200/60 dark:bg-emerald-950/20 dark:ring-emerald-800/40'
                    : status === 'partial'
                      ? 'bg-amber-50/70 ring-amber-200/60 dark:bg-amber-950/20 dark:ring-amber-800/40'
                      : 'bg-red-50/70 ring-red-200/60 dark:bg-red-950/20 dark:ring-red-800/40'
                }`}
              >
                <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  Payment Summary
                </div>
                <div className="space-y-1.5 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(paid, currency)}
                    </span>
                  </div>
                  {owed > 0.005 && (
                    <div className="flex items-baseline justify-between border-t border-border/40 pt-2">
                      <span className="text-sm font-semibold text-foreground">Balance Due</span>
                      <span className="text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
                        {formatCurrency(owed, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {history.length > 0 && (
            <div className="border-t border-border/60 px-5 py-5 sm:px-10 sm:py-6">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardList className="h-3 w-3" />
                Payment History
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60">
                <div className="hidden border-b border-border/60 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-12 sm:px-4 sm:py-2.5 dark:bg-zinc-900/50">
                  <div className="sm:col-span-3">Date</div>
                  <div className="sm:col-span-2">Type</div>
                  <div className="sm:col-span-5">Notes</div>
                  <div className="text-right sm:col-span-2">Amount</div>
                </div>
                <div className="divide-y divide-border/60">
                  {history.map((h, idx) => {
                    const isPayment = h.amount < 0 || h.type === 'manual_payment'
                    return (
                      <div
                        key={String(h.id ?? idx)}
                        className="grid grid-cols-12 gap-2 px-3 py-3 text-sm transition-colors hover:bg-slate-50/40 sm:px-4 sm:py-3 dark:hover:bg-zinc-900/30"
                      >
                        <div className="col-span-12 tabular-nums text-muted-foreground sm:col-span-3">
                          <span className="text-[10px] uppercase tracking-wider sm:hidden">Date </span>
                          {formatDate(h.createdAt, 'datetime')}
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <span className="text-[10px] uppercase tracking-wider sm:hidden">Type </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-zinc-800 dark:text-slate-300">
                            {isPayment ? 'Payment' : h.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="col-span-12 text-xs text-muted-foreground sm:col-span-5">
                          <span className="text-[10px] uppercase tracking-wider sm:hidden">Notes </span>
                          {h.notes || '—'}
                        </div>
                        <div className="col-span-6 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 sm:col-span-2">
                          <span className="text-[10px] uppercase tracking-wider sm:hidden">Amount </span>
                          {formatCurrency(Math.abs(h.amount), currency)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="border-t border-border/60 bg-amber-50/30 px-5 py-4 sm:px-10 dark:bg-amber-950/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 text-sm italic text-foreground">{sale.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border/60 bg-gradient-to-b from-white to-slate-50/50 px-5 py-5 dark:from-card dark:to-zinc-900/30 sm:px-10 sm:py-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="order-2 text-center sm:order-1 sm:text-left">
                <p className="text-sm font-semibold text-foreground">
                  <Receipt className="mr-1.5 inline-block h-3.5 w-3.5 text-primary" />
                  Thank you for your purchase!
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
