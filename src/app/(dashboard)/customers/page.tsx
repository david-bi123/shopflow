'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  Trash2,
  CreditCard,
  HandCoins,
  TrendingUp,
  AlertTriangle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Receipt,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  totalSales: number
  totalRevenue: number
  totalDebt: number
  firstDebtAt: string | null
  lastDebtActivityAt: string | null
  createdAt: string
}

const PAGE_SIZE = 10

type FilterMode = 'all' | 'debtors'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'>('cash')
  const [payNotes, setPayNotes] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  // Fetch every customer in the tenant (bypassing server pagination so
  // we can show running totals and filter client-side by debt). The
  // server is still tenant-scoped, so this is safe.
  async function refresh() {
    setLoading(true)
    try {
      const { getCustomers } = await import('@/lib/actions/customer-actions')
      const data = await getCustomers(1, 500, search)
      if ('error' in data && data.error) {
        setError(data.error)
        setCustomers([])
      } else {
        setCustomers(((data as unknown as { customers: Customer[] }).customers) ?? [])
      }
    } catch {
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const filtered = useMemo(() => {
    if (filter === 'debtors') return customers.filter((c) => (c.totalDebt ?? 0) > 0.005)
    return customers
  }, [customers, filter])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalDebt = useMemo(
    () => customers.reduce((sum, c) => sum + (c.totalDebt ?? 0), 0),
    [customers]
  )
  const debtorCount = useMemo(
    () => customers.filter((c) => (c.totalDebt ?? 0) > 0.005).length,
    [customers]
  )

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setCreating(true)
    try {
      const { createCustomer } = await import('@/lib/actions/customer-actions')
      const res = await createCustomer({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      })
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Customer created')
      setCreateOpen(false)
      setForm({ name: '', email: '', phone: '', address: '', notes: '' })
      void refresh()
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer? Sales/invoices that reference them keep their stored name.')) return
    try {
      const { deleteCustomer } = await import('@/lib/actions/customer-actions')
      const res = await deleteCustomer(id)
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Customer deleted')
      void refresh()
    } catch {
      toast.error('Failed to delete customer')
    }
  }

  function openPayDialog(c: Customer) {
    setPayingCustomer(c)
    setPayAmount(String(c.totalDebt.toFixed(2)))
    setPayMethod('cash')
    setPayNotes('')
  }

  async function handlePay() {
    if (!payingCustomer) return
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (amount > payingCustomer.totalDebt + 0.001) {
      toast.error(`Cannot exceed outstanding debt of ${formatCurrency(payingCustomer.totalDebt)}`)
      return
    }
    setPaying(true)
    try {
      const { recordDebtPayment } = await import('@/lib/actions/debt-actions')
      const res = await recordDebtPayment({
        customerId: payingCustomer.id,
        amount,
        paymentMethod: payMethod,
        notes: payNotes || undefined,
      })
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Payment of ${formatCurrency(amount)} recorded. New balance: ${formatCurrency(res.balanceAfter ?? 0)}`)
      setPayingCustomer(null)
      void refresh()
    } finally {
      setPaying(false)
    }
  }

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void refresh()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Customers"
        description="Track who owes you. Everyone starts as a customer; only those with a balance are 'debtors'."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="bg-gradient-to-r from-primary to-primary/80 shadow-md"
        >
          <Plus className="mr-1.5 size-4" />
          New Customer
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/20">
                <Users className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Customers
                </p>
                <p className="text-2xl font-bold tracking-tight">{formatNumber(customers.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500/5 to-amber-500/0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-inset ring-amber-500/20">
                <AlertTriangle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Debtors
                </p>
                <p className="text-2xl font-bold tracking-tight text-amber-600">
                  {formatNumber(debtorCount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-500/5 to-red-500/0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-inset ring-red-500/20">
                <HandCoins className="size-4 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Outstanding
                </p>
                <p className="text-2xl font-bold tracking-tight text-red-600 tabular-nums">
                  {formatCurrency(totalDebt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            className="w-full pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/50 p-0.5 shadow-sm">
          <button
            onClick={() => { setFilter('all'); setPage(1) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all' ? 'bg-white text-foreground shadow-sm ring-1 ring-border/60 dark:bg-zinc-800' : 'text-muted-foreground'
            )}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => { setFilter('debtors'); setPage(1) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'debtors' ? 'bg-white text-foreground shadow-sm ring-1 ring-border/60 dark:bg-zinc-800' : 'text-muted-foreground'
            )}
          >
            <AlertTriangle className="mr-1 inline size-3" />
            Debtors ({debtorCount})
          </button>
        </div>
      </div>

      {/* Data table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {filter === 'debtors' ? (
              <HandCoins className="size-6 text-emerald-500" />
            ) : (
              <Users className="size-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-base font-semibold">
            {filter === 'debtors' ? 'No outstanding debts' : 'No customers yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'debtors'
              ? 'Great work! Every customer is fully paid up.'
              : 'Add your first customer to get started.'}
          </p>
          {filter !== 'debtors' && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              New Customer
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Customer',
              primaryOnCard: true,
              cell: (c: Customer) => (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/customers/${c.id}`) }}
                  className="text-left font-medium hover:text-primary transition-colors"
                >
                  {c.name}
                </button>
              ),
            },
            {
              key: 'phone',
              header: 'Phone',
              mobileLabel: 'Phone',
              cell: (c: Customer) => <span className="text-muted-foreground">{c.phone ?? '—'}</span>,
            },
            {
              key: 'totalSales',
              header: 'Sales',
              mobileLabel: 'Sales',
              cell: (c: Customer) => (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  {c.totalSales}
                </span>
              ),
            },
            {
              key: 'totalRevenue',
              header: 'Revenue',
              mobileLabel: 'Revenue',
              cell: (c: Customer) => (
                <span className="font-semibold text-violet-600 tabular-nums">{formatCurrency(c.totalRevenue)}</span>
              ),
            },
            {
              key: 'debt',
              header: 'Outstanding',
              mobileLabel: 'Outstanding',
              cell: (c: Customer) =>
                c.totalDebt > 0.005 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200/60">
                    <AlertTriangle className="size-3" />
                    {formatCurrency(c.totalDebt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Paid up
                  </span>
                ),
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'w-36',
              cell: (c: Customer) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={(e) => { e.stopPropagation(); router.push(`/customers/${c.id}`) }}
                    aria-label={`View ${c.name}`}
                  >
                    <Eye className="size-4 text-muted-foreground" />
                  </Button>
                  {c.totalDebt > 0.005 && (
                    <Button
                      size="sm"
                      className="h-8 rounded-full bg-emerald-600 px-2.5 text-xs shadow-sm hover:bg-emerald-700"
                      onClick={(e) => { e.stopPropagation(); openPayDialog(c) }}
                    >
                      <CreditCard className="mr-1 size-3.5" />
                      Record Payment
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={paginated}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => router.push(`/customers/${c.id}`)}
          renderCardActions={(c) =>
            c.totalDebt > 0.005 ? (
              <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-emerald-600 shadow-sm hover:bg-emerald-700"
                onClick={(e) => { e.stopPropagation(); openPayDialog(c) }}
                aria-label="Record payment"
              >
                <CreditCard className="size-4 text-white" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                aria-label="Delete"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )
          }
        />
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-full border-border/60 shadow-sm"
            >
              <ChevronLeft className="mr-1 size-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * PAGE_SIZE >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-full border-border/60 shadow-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create customer dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>
              A customer only becomes a debtor once you create a sale or invoice and leave
              the &quot;Amount Paid&quot; field below the total. Until then they&apos;re just
              a record of name + phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer full name"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+233 ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record debt payment dialog */}
      <Dialog open={!!payingCustomer} onOpenChange={(o) => !o && setPayingCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Debt Payment</DialogTitle>
            <DialogDescription>
              {payingCustomer && (
                <>
                  Recording a payment for <span className="font-semibold">{payingCustomer.name}</span>.
                  Their current outstanding debt is{' '}
                  <span className="font-semibold text-red-600">
                    {formatCurrency(payingCustomer.totalDebt)}
                  </span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="payAmount">Amount Received (GH\u20b5) *</Label>
              <div className="relative">
                <Input
                  id="payAmount"
                  type="number"
                  min="0.01"
                  max={payingCustomer?.totalDebt ?? undefined}
                  step="0.01"
                  className="pr-14"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider"
                  onClick={() => payingCustomer && setPayAmount(payingCustomer.totalDebt.toFixed(2))}
                >
                  Pay All
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payMethod">Payment Method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                <SelectTrigger id="payMethod">
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
              <Label htmlFor="payNotes">Notes (optional)</Label>
              <Textarea
                id="payNotes"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. 'Defrayment for the Premium Service invoice'"
                rows={2}
              />
            </div>

            {payingCustomer && payAmount && !isNaN(parseFloat(payAmount)) && (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current balance</span>
                  <span className="tabular-nums">{formatCurrency(payingCustomer.totalDebt)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Amount to record</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    \u2212{formatCurrency(Math.min(parseFloat(payAmount) || 0, payingCustomer.totalDebt))}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border/60 pt-1.5">
                  <span className="font-medium">New balance</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(
                      Math.max(0, payingCustomer.totalDebt - (parseFloat(payAmount) || 0))
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingCustomer(null)}>Cancel</Button>
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

// Avoid an unused import warning for the X icon
void X
