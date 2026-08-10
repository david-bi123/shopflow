import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  FileText,
  CreditCard,
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
    waybillNo?: string | null
    companyRefNo?: string | null
    carNo?: string | null
    saleDate?: string | null
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
  const whatsappMessage = `Invoice ${sale.saleNumber} - ${sale.customerName || 'Customer'} - Total: ${formatCurrency(sale.total, currency)}`
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
    <div className="min-h-screen bg-slate-100 py-6 dark:bg-zinc-950 sm:py-10 print:bg-white print:py-0">
      <div className="mx-auto flex min-h-[calc(100vh_-_3rem)] w-full max-w-3xl flex-col px-4 sm:min-h-[calc(100vh_-_5rem)] print:min-h-0">
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
          className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border/60 bg-white shadow-2xl shadow-slate-200/60 dark:bg-card dark:shadow-black/30 print:shadow-none print:border-0 print:rounded-none"
          id="receipt"
        >
          {/* Header (mirrors PDF: navy band, centered store identity, accent bar) */}
          <div className="relative bg-[#0f172a] px-5 py-7 sm:px-10 sm:py-8">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#1e3a5f]" />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">{tenant.name}</h1>
              {tenant.description && (
                <p className="mt-1 text-xs italic text-slate-300">
                  {tenant.description}
                </p>
              )}
              <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                {tenant.address && <p>{tenant.address}</p>}
                {tenant.phone && <p>Tel: {tenant.phone}</p>}
                {tenant.email && <p>{tenant.email}</p>}
                {tenant.taxNumber && <p className="font-medium">Tax ID: {tenant.taxNumber}</p>}
              </div>
            </div>
          </div>

          {/* Title + number + status badge (mirrors PDF body) */}
          <div className="px-5 pt-7 text-center sm:px-10 sm:pt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Invoice
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
              Invoice #{sale.saleNumber}
            </h2>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig.bgClass} ${statusConfig.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </div>
          </div>

          {/* Customer + Invoice details (mirrors PDF side-by-side) */}
          <div className="grid grid-cols-1 gap-6 border-y border-border/60 px-5 py-5 sm:grid-cols-2 sm:px-10 sm:py-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Customer:
              </p>
              <p className="mt-1.5 text-base font-semibold text-foreground">
                {sale.customerName || 'Walk-in customer'}
              </p>
              {sale.customerPhone && (
                <p className="mt-1 text-xs text-muted-foreground">{sale.customerPhone}</p>
              )}
              {sale.customerEmail && (
                <p className="mt-0.5 text-xs text-muted-foreground">{sale.customerEmail}</p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Invoice Date:</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatDate(sale.saleDate ?? sale.createdAt, 'long')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Payment Method:</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  <CreditCard className="h-3 w-3" />
                  {paymentMethodLabel}
                </span>
              </div>
              {isUpdated && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Last Updated:</span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {formatDate(sale.updatedAt, 'long')}
                  </span>
                </div>
              )}
              {tenant.taxNumber && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Our Tax ID:</span>
                  <span className="text-xs font-medium text-foreground">{tenant.taxNumber}</span>
                </div>
              )}
              {sale.waybillNo && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">WAY-BILL NO:</span>
                  <span className="text-xs font-medium text-foreground">{sale.waybillNo}</span>
                </div>
              )}
              {sale.companyRefNo && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">COMPANY REF NO:</span>
                  <span className="text-xs font-medium text-foreground">{sale.companyRefNo}</span>
                </div>
              )}
              {sale.carNo && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">CAR NO:</span>
                  <span className="text-xs font-medium text-foreground">{sale.carNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-5 sm:px-10 sm:py-6">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" />
              Items
            </div>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="grid grid-cols-12 gap-2 bg-[#1e40af] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white sm:px-4 sm:py-2.5">
                <div className="col-span-12 sm:col-span-6">Item</div>
                <div className="col-span-4 text-right sm:col-span-2">Quantity</div>
                <div className="col-span-4 text-right sm:col-span-2">Unit Price</div>
                <div className="col-span-4 text-right sm:col-span-2">Total</div>
              </div>
              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-2 px-3 py-3 text-sm sm:px-4 sm:py-3.5 ${
                    idx % 2 === 0 ? 'bg-[#f8fafc] dark:bg-zinc-900/30' : 'bg-white dark:bg-card'
                  }`}
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

          {/* Totals + Payment Summary (mirrors PDF: blue-accent totals box + gray payment box) */}
          <div className="flex justify-end border-t border-border/60 px-5 py-4 sm:px-10 sm:py-5">
            <div className="w-full max-w-xs space-y-3 text-sm">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm dark:bg-card">
                <div className="h-1 bg-[#1e40af]" />
                <div className="space-y-2 px-4 py-3.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(sale.subtotal, currency)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Discount{(sale.discountPercent ?? 0) > 0 ? ` (${(sale.discountPercent ?? 0).toFixed(2)}%)` : ''}
                      </span>
                      <span className="tabular-nums text-red-600 dark:text-red-400">
                        −{formatCurrency(sale.discount, currency)}
                      </span>
                    </div>
                  )}
                  {sale.taxItems && sale.taxItems.length > 0 ? (
                    <>
                      {sale.taxItems.map((t) => (
                        <div key={t.name} className="flex justify-between text-muted-foreground">
                          <span>
                            {t.name} <span className="text-[10px] text-muted-foreground/70">({t.rate}%)</span>
                          </span>
                          <span className="tabular-nums">{formatCurrency(t.amount, currency)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-dashed border-border/60 pt-1.5">
                        <span className="font-medium text-foreground">Tax Subtotal</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCurrency(sale.tax, currency)}
                        </span>
                      </div>
                    </>
                  ) : (
                    sale.tax > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax</span>
                        <span className="tabular-nums">{formatCurrency(sale.tax, currency)}</span>
                      </div>
                    )
                  )}
                  <div className="flex items-baseline justify-between border-t border-border/60 pt-2.5">
                    <span className="text-sm font-bold uppercase tracking-wide text-foreground">Total</span>
                    <span className="text-lg font-bold tabular-nums text-foreground">
                      {formatCurrency(sale.total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-border/40 dark:bg-zinc-900/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount in words
                </p>
                <p className="mt-0.5 text-xs italic leading-relaxed text-foreground/80">
                  {formatAmountInWords(sale.total, currency)}
                </p>
              </div>

              {/* Payment Summary box (gray like the PDF) */}
              <div className="overflow-hidden rounded-xl bg-[#f1f5f9] ring-1 ring-inset ring-border/60 dark:bg-zinc-900/40">
                <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Wallet className="h-3 w-3" />
                  Payment Summary
                </div>
                <div className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(sale.total, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(paid, currency)}
                    </span>
                  </div>
                  {owed > 0.005 && (
                    <div className="flex items-baseline justify-between border-t border-border/40 pt-2">
                      <span className="text-sm font-bold text-foreground">Balance Due</span>
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

          {/* Footer (mirrors PDF gray band, pinned to the bottom of the page) */}
          <div className="mt-auto border-t border-border/60 bg-[#f8fafc] px-5 py-5 dark:bg-zinc-900/30 sm:px-10 sm:py-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="order-2 text-center sm:order-1 sm:text-left">
                <p className="text-sm font-semibold text-foreground">
                  <Receipt className="mr-1.5 inline-block h-3.5 w-3.5 text-primary" />
                  Thank you for your business!
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {tenant.name} • Generated by IndFlow
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
