'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  User,
  Phone,
  Calendar,
  Hash,
  FileText,
  Receipt,
  ReceiptText,
  CircleCheck,
  Printer,
  Copy,
  Check,
  HandCoins,
  Pencil,
  ClipboardList,
  Truck,
  Building2,
  Car,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getSaleById, deleteSale } from '@/lib/actions/sale-actions'
import { getSalePaymentHistory } from '@/lib/actions/debt-actions'
import { RecordPaymentDialog } from './record-payment-dialog'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Sale } from '@/lib/validations/sale'

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{
      id?: string | number
      type: string
      amount: number
      notes?: string | null
      balanceAfter?: number
      createdAt: string
    }>
  >([])
  const [paymentOpen, setPaymentOpen] = useState(false)

  const load = async () => {
    try {
      const data = await getSaleById(params.id as string)
      if ('error' in data) {
        setError(data.error ?? 'Sale not found')
        return
      }
      setSale((data as unknown as { sale: Sale }).sale)
      const hist = await getSalePaymentHistory(params.id as string)
      if (hist && 'history' in hist && Array.isArray(hist.history)) {
        setPaymentHistory(hist.history as typeof paymentHistory)
      }
    } catch {
      setError('Failed to load sale')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleDelete = async () => {
    try {
      await deleteSale(params.id as string)
      toast.success('Sale deleted')
      router.push('/sales')
    } catch {
      toast.error('Failed to delete sale')
    }
  }

  const handleCopyLink = async () => {
    if (!sale) return
    const token = (sale as { publicToken?: string }).publicToken ?? sale.saleNumber
    const url = `${window.location.origin}/r/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Invoice link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleShareWhatsApp = () => {
    if (!sale) return
    const token = (sale as { publicToken?: string }).publicToken ?? sale.saleNumber
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `Sale ${sale.saleNumber} - Customer: ${sale.customerName} - Total: ${formatCurrency(sale.total)}`
      )}%0A${window.location.origin}/r/${token}`,
      '_blank'
    )
  }

  const handleDownloadPdf = () => {
    if (!sale) return
    const token = (sale as { publicToken?: string }).publicToken ?? sale.saleNumber
    window.open(`/api/r/${token}/pdf`, '_blank')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <Receipt className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">{error ?? 'Sale not found'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The sale you&apos;re looking for doesn&apos;t exist or was removed.
        </p>
        <Button asChild className="mt-5">
          <Link href="/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to Sales
          </Link>
        </Button>
      </div>
    )
  }

  const paidHistory = paymentHistory.filter((h) => h.type !== 'sale_created')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/sales" aria-label="Back to sales">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              {sale.saleNumber}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Calendar className="mr-1 inline size-3" />
              {formatDate(sale.saleDate ?? sale.createdAt, 'long')}
              <span className="mx-1.5 text-border">•</span>
              <Hash className="mr-1 inline size-3" />
              {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="mr-1.5 size-3.5 text-emerald-500" /> : <Copy className="mr-1.5 size-3.5" />}
            {copied ? 'Copied' : 'Link'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="mr-1.5 size-3.5" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="mr-1.5 size-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-3.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sales/${sale.id}/edit`}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1.5 size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Single vertical receipt-style card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Details */}
        <section className="px-5 py-5 sm:px-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="size-4 text-primary" />
            Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <User className="size-4" />
                Customer
              </dt>
              <dd className="text-right font-medium text-foreground">
                {sale.customerName || 'Walk-in Customer'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                Phone
              </dt>
              <dd className="text-right font-medium text-foreground">
                {sale.customerPhone || '—'}
              </dd>
            </div>
            {sale.waybillNo && (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <Truck className="size-4" />
                  WAY-BILL NO
                </dt>
                <dd className="text-right font-medium text-foreground">{sale.waybillNo}</dd>
              </div>
            )}
            {sale.companyRefNo && (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <Building2 className="size-4" />
                  COMPANY REF NO
                </dt>
                <dd className="text-right font-medium text-foreground">{sale.companyRefNo}</dd>
              </div>
            )}
            {sale.carNo && (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <Car className="size-4" />
                  CAR NO
                </dt>
                <dd className="text-right font-medium text-foreground">{sale.carNo}</dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                Date
              </dt>
              <dd className="text-right font-medium tabular-nums text-foreground">
                {formatDate(sale.saleDate ?? sale.createdAt, 'long')}
              </dd>
            </div>
          </dl>
        </section>

        <Separator />

        {/* Items */}
        <section className="px-5 py-5 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Receipt className="size-4 text-primary" />
              Items
            </h2>
            <span className="text-xs text-muted-foreground">
              {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
            </span>
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
                    {formatCurrency(item.price)}
                  </div>
                  <div className="col-span-4 text-right tabular-nums font-semibold text-foreground sm:col-span-2">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* Payment summary */}
        <section className="px-5 py-5 sm:px-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <ReceiptText className="size-4 text-primary" />
            Payment Summary
          </h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(sale.subtotal)}
              </span>
            </div>
            {sale.discount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Discount{sale.discountPercent > 0 ? ` (${sale.discountPercent.toFixed(2)}%)` : ''}
                </span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  −{formatCurrency(sale.discount)}
                </span>
              </div>
            )}
            {sale.taxItems && sale.taxItems.length > 0 ? (
              <>
                {sale.taxItems.map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.name} <span className="text-[10px] text-muted-foreground/70">({t.rate}%)</span>
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      +{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-dashed border-border/60 pt-1.5">
                  <span className="font-medium text-muted-foreground">Tax Subtotal</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    +{formatCurrency(sale.tax)}
                  </span>
                </div>
              </>
            ) : (
              sale.tax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums text-foreground">
                    +{formatCurrency(sale.tax)}
                  </span>
                </div>
              )
            )}
            <div className="flex items-baseline justify-between border-t border-border/60 pt-3">
              <span className="text-base font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(sale.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(sale.amountPaid ?? sale.total)}
              </span>
            </div>
            {(sale.amountOwed ?? 0) > 0.005 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-red-700 dark:text-red-300">Outstanding</span>
                  <span className="text-xl font-bold tabular-nums text-red-700 dark:text-red-300">
                    {formatCurrency(sale.amountOwed)}
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="mt-2 w-full"
                >
                  <HandCoins className="mr-2 size-4" />
                  Record Payment
                </Button>
              </>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50/70 p-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800/40">
                <CircleCheck className="size-4" />
                Paid in full
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {sale.notes && (
          <>
            <Separator />
            <section className="px-5 py-5 sm:px-6">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="size-4 text-primary" />
                Notes
              </h2>
              <p className="text-sm italic text-muted-foreground">{sale.notes}</p>
            </section>
          </>
        )}

        {/* Payment history */}
        {paymentHistory.length > 0 && (
          <>
            <Separator />
            <section className="px-5 py-5 sm:px-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <ClipboardList className="size-4 text-primary" />
                  Payment History
                </h2>
                <span className="text-xs text-muted-foreground">
                  {paidHistory.length} {paidHistory.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {paymentHistory.map((h, idx) => {
                  const isPayment = h.amount < 0 || h.type === 'manual_payment'
                  const isCreation = h.type === 'sale_created'
                  return (
                    <div key={String(h.id ?? idx)} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {isCreation ? 'Sale Created' : 'Payment'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(h.createdAt, 'datetime')}
                          {h.notes ? ` · ${h.notes}` : ''}
                        </p>
                      </div>
                      <span
                        className={
                          isPayment
                            ? 'shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'
                            : 'shrink-0 text-sm font-semibold tabular-nums text-foreground'
                        }
                      >
                        {isPayment ? '−' : '+'}
                        {formatCurrency(Math.abs(h.amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Record Payment Dialog */}
      {sale && (
        <RecordPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          saleId={String(sale.id)}
          saleNumber={sale.saleNumber}
          customerName={sale.customerName ?? ''}
          balanceDue={Math.max(0, Math.round((sale.amountOwed ?? 0) * 100) / 100)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
