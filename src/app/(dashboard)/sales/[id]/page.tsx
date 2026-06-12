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
  CreditCard,
  Calendar,
  Hash,
  FileText,
  Receipt,
  Banknote,
  ReceiptText,
  CircleCheck,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  HandCoins,
  Pencil,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getSaleById, deleteSale } from '@/lib/actions/sale-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Sale } from '@/lib/validations/sale'

const PAYMENT_META: Record<string, { label: string; icon: React.ElementType; className: string; bgClass: string }> = {
  cash: {
    label: 'Cash',
    icon: Banknote,
    className: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-50 ring-emerald-200/60 dark:bg-emerald-950/60 dark:ring-emerald-800/40',
  },
  card: {
    label: 'Card',
    icon: CreditCard,
    className: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 ring-blue-200/60 dark:bg-blue-950/60 dark:ring-blue-800/40',
  },
  mobile_money: {
    label: 'Mobile Money',
    icon: Phone,
    className: 'text-violet-700 dark:text-violet-300',
    bgClass: 'bg-violet-50 ring-violet-200/60 dark:bg-violet-950/60 dark:ring-violet-800/40',
  },
  bank_transfer: {
    label: 'Bank Transfer',
    icon: ReceiptText,
    className: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-50 ring-amber-200/60 dark:bg-amber-950/60 dark:ring-amber-800/40',
  },
  other: {
    label: 'Other',
    icon: CircleCheck,
    className: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/40',
  },
}

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSaleById(params.id as string)
        if ('error' in data) {
          setError(data.error ?? 'Sale not found')
          return
        }
        setSale((data as unknown as { sale: Sale }).sale)
      } catch {
        setError('Failed to load sale')
      } finally {
        setLoading(false)
      }
    }
    load()
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
      toast.success('Receipt link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
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

  const paymentKey = (sale.paymentMethod || 'other').toLowerCase()
  const payment = PAYMENT_META[paymentKey] ?? PAYMENT_META.other
  const PaymentIcon = payment.icon

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="shrink-0 bg-white/80 dark:bg-zinc-900/60">
              <Link href="/sales">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sale Receipt
                </p>
                <Badge className="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40">
                  <CircleCheck className="mr-1 size-3" />
                  Completed
                </Badge>
                {(sale.amountOwed ?? 0) > 0.005 && (
                  <Badge className="bg-red-100 text-red-700 ring-1 ring-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/40">
                    <AlertTriangle className="mr-1 size-3" />
                    Owes {formatCurrency(sale.amountOwed)}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{sale.saleNumber}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(sale.createdAt)}
                </span>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1">
                  <Hash className="size-3" />
                  {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              {copied ? <Check className="mr-2 size-4 text-emerald-500" /> : <Copy className="mr-2 size-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const token = (sale as { publicToken?: string }).publicToken ?? sale.saleNumber
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(
                    `Sale ${sale.saleNumber} - Customer: ${sale.customerName} - Total: ${formatCurrency(sale.total)}`
                  )}%0A${window.location.origin}/r/${token}`,
                  '_blank'
                )
              }}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Share2 className="mr-2 size-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const token = (sale as { publicToken?: string }).publicToken ?? sale.saleNumber
                window.open(`/api/r/${token}/pdf`, '_blank')
              }}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Download className="mr-2 size-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sales/${sale.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Quick info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                <User className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {sale.customerName || 'Walk-in Customer'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 ring-1 ring-inset ring-chart-2/20">
                <Phone className="size-4 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {sale.customerPhone || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${payment.bgClass}`}
              >
                <PaymentIcon className={`size-4 ${payment.className}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment
                </p>
                <p className="truncate text-sm font-semibold text-foreground">{payment.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-chart-2/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                <Receipt className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
                <p className="truncate text-base font-bold tabular-nums text-foreground">
                  {formatCurrency(sale.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                Items Purchased
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {sale.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/40 dark:hover:bg-zinc-900/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-primary" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(sale.subtotal)}
              </span>
            </div>
            {sale.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount{sale.discountPercent > 0 ? ` (${sale.discountPercent.toFixed(2)}%)` : ''}
                </span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  −{formatCurrency(sale.discount)}
                </span>
              </div>
            )}
            {sale.taxItems && sale.taxItems.length > 0 ? (
              sale.taxItems.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.name} <span className="text-[10px] text-muted-foreground/70">({t.rate}%)</span>
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    +{formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            ) : (
              sale.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums text-foreground">
                    +{formatCurrency(sale.tax)}
                  </span>
                </div>
              )
            )}
            <Separator className="my-2" />
            <div className="flex items-baseline justify-between rounded-xl bg-primary/5 p-3 ring-1 ring-inset ring-primary/10">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(sale.total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(sale.amountPaid ?? sale.total)}
              </span>
            </div>
            {(sale.amountOwed ?? 0) > 0.005 && (
              <div className="flex items-baseline justify-between rounded-xl bg-red-50/60 p-3 ring-1 ring-inset ring-red-200/60 dark:bg-red-950/30 dark:ring-red-800/40">
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">Outstanding</span>
                <span className="text-xl font-bold tabular-nums text-red-700 dark:text-red-300">
                  {formatCurrency(sale.amountOwed)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {sale.notes && (
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-sm italic text-muted-foreground">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
