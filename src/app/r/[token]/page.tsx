import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Store, ArrowLeft, CheckCircle2, Calendar, Hash, User, Phone, CreditCard, FileText, MapPin } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getSaleByPublicToken } from '@/lib/actions/sale-actions'
import { PublicActions } from '@/components/shared/public-actions'

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
    items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
    subtotal: number
    discount: number
    tax: number
    total: number
    paymentMethod: string
    notes?: string | null
    createdAt: string
    currency?: string
    discountPercent?: number
    taxItems?: Array<{ name: string; rate: number; amount: number }>
    tenant?: { name: string; slug: string; phone?: string; email?: string; address?: string; description?: string; taxNumber?: string }
  }) | null

  if (!sale) {
    notFound()
  }

  const currency = sale.currency ?? 'GHS'
  const tenant = sale.tenant ?? { name: 'Store', slug: '' }

  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${token}`
  const pdfUrl = `/api/r/${token}/pdf`
  const whatsappMessage = `Sale ${sale.saleNumber} - ${sale.customerName || 'Customer'} - Total: ${formatCurrency(sale.total, currency)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}%0A${receiptUrl}`

  const paymentLabel = sale.paymentMethod
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-6 dark:from-black dark:via-zinc-950 dark:to-emerald-950/20 sm:py-12">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-all hover:bg-white hover:text-foreground hover:shadow dark:bg-zinc-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <PublicActions pdfUrl={pdfUrl} pageUrl={receiptUrl} whatsappUrl={whatsappUrl} />
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/20 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white sm:text-base">Payment Confirmed</p>
              <p className="text-xs text-emerald-50/90">Thank you for your purchase</p>
            </div>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-xl shadow-slate-200/50 dark:bg-card dark:shadow-black/20 print:shadow-none"
          id="receipt"
        >
          <div className="relative border-b border-border/60 bg-gradient-to-br from-slate-50/80 to-white px-5 py-6 dark:from-zinc-900/50 dark:to-card sm:px-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
            <div className="text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">{tenant.name}</h1>
              {tenant.description && (
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                  {tenant.description}
                </p>
              )}
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Official Receipt
              </p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {tenant.address && (
                  <p className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" /> {tenant.address}
                  </p>
                )}
                {tenant.phone && (
                  <p className="flex items-center justify-center gap-1">
                    <Phone className="h-3 w-3" /> {tenant.phone}
                  </p>
                )}
                {tenant.taxNumber && (
                  <p className="flex items-center justify-center gap-1 text-[10px] font-medium">
                    Tax ID: {tenant.taxNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-border/60 bg-border/40">
            <div className="bg-white px-4 py-3 dark:bg-card sm:px-5 sm:py-3.5">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Hash className="h-3 w-3" />
                Receipt
              </div>
              <p className="truncate text-sm font-semibold text-foreground">{sale.saleNumber}</p>
            </div>
            <div className="bg-white px-4 py-3 dark:bg-card sm:px-5 sm:py-3.5">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Date
              </div>
              <p className="text-sm font-semibold text-foreground">{formatDate(sale.createdAt)}</p>
            </div>
          </div>

          {sale.customerName && (
            <div className="border-b border-border/60 px-5 py-4 sm:px-6">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3 w-3" />
                Customer
              </div>
              <p className="text-sm font-semibold text-foreground">{sale.customerName}</p>
              {sale.customerPhone && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {sale.customerPhone}
                </p>
              )}
            </div>
          )}

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" />
              Items
            </div>
            <div className="space-y-2.5">
              {sale.items.map((item: { name: string; quantity: number; price: number; subtotal: number }, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-50/60 px-3 py-2.5 dark:bg-zinc-900/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.price, currency)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(item.subtotal, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border/60 bg-slate-50/50 px-5 py-4 text-sm dark:bg-zinc-900/30 sm:px-6">
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
              <span className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                {formatCurrency(sale.total, currency)}
              </span>
            </div>
          </div>

          <div className="border-t border-border/60 px-5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Paid via {paymentLabel}</span>
            </div>
          </div>

          {sale.notes && (
            <div className="border-t border-border/60 bg-amber-50/40 px-5 py-3 text-center text-xs italic text-muted-foreground dark:bg-amber-950/20 sm:px-6 sm:py-3.5">
              {sale.notes}
            </div>
          )}

          <div className="border-t border-border/60 bg-gradient-to-b from-white to-slate-50/50 px-5 py-5 dark:from-card dark:to-zinc-900/30 sm:px-6 sm:py-6">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl border border-border/60 bg-white p-2.5 shadow-sm">
                <div className="flex h-20 w-20 items-center justify-center">
                  <svg viewBox="0 0 33 33" className="h-20 w-20">
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
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Scan to verify
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 bg-slate-50/50 px-5 py-3.5 text-center dark:bg-zinc-900/30">
            <p className="text-xs font-medium text-foreground">Thank you for your purchase!</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Generated by {tenant.name} · Powered by IndFlow
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
