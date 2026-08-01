'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  HandCoins,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { EditCustomerDialog } from '@/components/customers/edit-customer-dialog'

interface LedgerEntry {
  id: string
  amount: number
  type: string
  referenceType: string | null
  referenceId: number | null
  notes: string | null
  balanceAfter: number
  createdAt: string
}

interface OpenSale {
  id: string
  saleNumber: string
  total: number
  amountPaid: number
  amountOwed: number
  createdAt: string
}

interface SaleHistoryItem {
  id: string
  saleNumber: string
  total: number
  amountPaid: number
  amountOwed: number
  paymentMethod: string
  createdAt: string
}

interface CustomerSummary {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  totalDebt: number
  firstDebtAt: string | null
  lastDebtActivityAt: string | null
  totalSales: number
  totalRevenue: number
}

const TYPE_META: Record<string, { label: string; color: string; icon: typeof ArrowUpCircle }> = {
  sale_created: {
    label: 'Sale created',
    color: 'text-red-700 bg-red-50 ring-red-200/60 dark:text-red-300 dark:bg-red-950/60 dark:ring-red-800/40',
    icon: ArrowUpCircle,
  },
  manual_payment: {
    label: 'Payment received',
    color: 'text-emerald-700 bg-emerald-50 ring-emerald-200/60 dark:text-emerald-300 dark:bg-emerald-950/60 dark:ring-emerald-800/40',
    icon: ArrowDownCircle,
  },
  sale_voided: {
    label: 'Sale reversed',
    color: 'text-slate-700 bg-slate-50 ring-slate-200/60 dark:text-slate-300 dark:bg-slate-900/60 dark:ring-slate-800/40',
    icon: ArrowDownCircle,
  },
}

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [openSales, setOpenSales] = useState<OpenSale[]>([])
  const [allSales, setAllSales] = useState<SaleHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'>('cash')
  const [notes, setNotes] = useState('')

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const { getCustomerDebtLedger } = await import('@/lib/actions/debt-actions')
      const res = await getCustomerDebtLedger(id)
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      const data = res as unknown as { customer: CustomerSummary; ledger: LedgerEntry[]; openSales: OpenSale[]; allSales: SaleHistoryItem[] }
      setSummary(data.customer)
      setLedger(data.ledger)
      setOpenSales(data.openSales)
      setAllSales(data.allSales)
    } catch {
      setError('Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openPayDialog() {
    if (!summary) return
    setAmount(summary.totalDebt.toFixed(2))
    setMethod('cash')
    setNotes('')
    setPayOpen(true)
  }

  async function handlePay() {
    if (!summary) return
    const a = parseFloat(amount)
    if (!a || a <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (a > summary.totalDebt + 0.001) {
      toast.error(`Cannot exceed outstanding debt of ${formatCurrency(summary.totalDebt)}`)
      return
    }
    setPaying(true)
    try {
      const { recordDebtPayment } = await import('@/lib/actions/debt-actions')
      const res = await recordDebtPayment({
        customerId: id,
        amount: a,
        paymentMethod: method,
        notes: notes || undefined,
      })
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      const data = (res as { data?: { balanceAfter: number } }).data
      toast.success(`Payment recorded. New balance: ${formatCurrency(data?.balanceAfter ?? 0)}`)
      setPayOpen(false)
      void refresh()
    } finally {
      setPaying(false)
    }
  }

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">{error ?? 'Customer not found'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The customer you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/customers">
            <ArrowLeft className="mr-2 size-4" />
            Back to Customers
          </Link>
        </Button>
      </div>
    )
  }

  const hasDebt = summary.totalDebt > 0.005
  const totalOpen = openSales.reduce((s, x) => s + x.amountOwed, 0)

  return (
    <div className="space-y-5 pb-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-5 shadow-sm">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="shrink-0 bg-white/80 dark:bg-zinc-900/60">
              <Link href="/customers">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Customer
                </p>
                {hasDebt ? (
                  <Badge className="bg-red-100 text-red-700 ring-1 ring-red-200/60">
                    <AlertTriangle className="mr-1 size-3" />
                    Debtor
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60">
                    <CheckCircle2 className="mr-1 size-3" />
                    Paid up
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{summary.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {summary.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {summary.phone}
                  </span>
                )}
                {summary.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3" /> {summary.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Pencil className="mr-2 size-4" />
              Edit Customer
            </Button>
            {hasDebt && (
              <Button
                onClick={openPayDialog}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/25"
                size="lg"
              >
                <CreditCard className="mr-2 size-4" />
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Debt summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-500/5 to-red-500/0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-inset ring-red-500/20">
                <HandCoins className="size-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding Debt
                </p>
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  hasDebt ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {formatCurrency(summary.totalDebt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-500/5 to-violet-500/0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
                <TrendingUp className="size-4 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lifetime Sales
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(summary.totalRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(summary.totalSales)} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/20">
                <History className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Debt Activity
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {summary.firstDebtAt
                    ? `${formatDate(summary.firstDebtAt)} \u2192 ${summary.lastDebtActivityAt ? formatDate(summary.lastDebtActivityAt) : '—'}`
                    : 'No debt activity'}
                </p>
                <p className="text-[11px] text-muted-foreground">First to latest</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Debt Ledger */}
        <Card className="overflow-hidden border-0 shadow-sm lg:col-span-2">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <History className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Debt History</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Every event that changed this customer&apos;s balance
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ledger.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold">No debt activity yet</p>
                <p className="text-xs text-muted-foreground">
                  Debt only appears when a sale is created with an
                  Amount Paid below the total.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {ledger.map((entry) => {
                  const meta = TYPE_META[entry.type] ?? {
                    label: entry.type,
                    color: 'text-slate-700 bg-slate-50 ring-slate-200/60',
                    icon: History,
                  }
                  const Icon = meta.icon
                  const isPayment = entry.amount < 0
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4',
                        isPayment ? '' : 'bg-red-50/20 dark:bg-red-950/[0.04]'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                          meta.color
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('text-[10px] uppercase tracking-wider', meta.color)}>
                            {meta.label}
                          </Badge>
                          {entry.referenceType === 'sale' && entry.referenceId && (
                            <Link
                              href={`/sales/${entry.referenceId}`}
                              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                            >
                              View sale
                            </Link>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-foreground">{entry.notes ?? '\u2014'}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(entry.createdAt, 'datetime')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            'text-base font-bold tabular-nums',
                            isPayment ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {isPayment ? '\u2212' : '+'}
                          {formatCurrency(Math.abs(entry.amount))}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Balance: {formatCurrency(entry.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Sales */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-amber-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="size-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Open Sales</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sales still owing
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {openSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold">All paid up</p>
                <p className="text-xs text-muted-foreground">No open sales.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {openSales.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sales/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <Receipt className="size-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.saleNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(s.createdAt, 'short')} \u00b7 Total {formatCurrency(s.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600 tabular-nums">
                        {formatCurrency(s.amountOwed)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">of {formatCurrency(s.total)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {openSales.length > 0 && (
              <div className="border-t bg-muted/30 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Open total</span>
                  <span className="font-bold text-red-600 tabular-nums">
                    {formatCurrency(totalOpen)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Sales */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Receipt className="size-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Sales History</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Every sale made by this customer
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {allSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Receipt className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">No sales yet</p>
                <p className="text-xs text-muted-foreground">Sales will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {allSales.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sales/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <Receipt className="size-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.saleNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(s.createdAt, 'short')} \u00b7 {s.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(s.total)}</p>
                      {s.amountOwed > 0.005 ? (
                        <p className="text-[11px] font-medium text-red-600">
                          {formatCurrency(s.amountOwed)} owing
                        </p>
                      ) : (
                        <p className="text-[11px] font-medium text-emerald-600">Paid in full</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit customer dialog */}
      <EditCustomerDialog
        customer={summary ? {
          id: String(summary.id),
          name: summary.name,
          email: summary.email,
          phone: summary.phone,
          address: summary.address,
          notes: summary.notes,
        } : null}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => void refresh()}
      />

      {/* Record Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Debt Payment</DialogTitle>
            <DialogDescription>
              {summary && (
                <>
                  Recording a payment for <span className="font-semibold">{summary.name}</span>.
                  Current outstanding debt is{' '}
                  <span className="font-semibold text-red-600">
                    {formatCurrency(summary.totalDebt)}
                  </span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="payAmount2">Amount Received (GH\u20b5) *</Label>
              <div className="relative">
                <Input
                  id="payAmount2"
                  type="number"
                  min="0.01"
                  max={summary?.totalDebt ?? undefined}
                  step="0.01"
                  className="pr-14"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider"
                  onClick={() => summary && setAmount(summary.totalDebt.toFixed(2))}
                >
                  Pay All
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payMethod2">Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger id="payMethod2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payNotes2">Notes (optional)</Label>
              <Textarea
                id="payNotes2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 'Payment for the shoes bought last week'"
                rows={2}
              />
            </div>

            {summary && amount && !isNaN(parseFloat(amount)) && (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current balance</span>
                  <span className="tabular-nums">{formatCurrency(summary.totalDebt)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Amount to record</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    \u2212{formatCurrency(Math.min(parseFloat(amount) || 0, summary.totalDebt))}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border/60 pt-1.5">
                  <span className="font-medium">New balance</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(
                      Math.max(0, summary.totalDebt - (parseFloat(amount) || 0))
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePay}
              disabled={paying}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md"
            >
              {paying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Avoid unused-import warnings for the icons only used in dialogs/menus
void User
void MapPin
void Plus
void Separator
