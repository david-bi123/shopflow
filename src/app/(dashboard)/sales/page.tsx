'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Download,
  Share2,
  TrendingUp,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import {
  DateFilter,
  useDateRange,
  isInDateRange,
  type DatePreset,
} from '@/components/shared/date-filter'
import { getSales, deleteSale } from '@/lib/actions/sale-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Sale } from '@/lib/validations/sale'

const PAYMENT_METHODS = [
  { value: 'all', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_DOT: Record<string, string> = {
  cash: 'bg-emerald-500',
  card: 'bg-blue-500',
  mobile_money: 'bg-amber-500',
  bank_transfer: 'bg-violet-500',
  other: 'bg-gray-500',
}

const ITEMS_PER_PAGE = 10

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const dateRange = useDateRange(datePreset, dateFrom, dateTo)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getSales()
        if (cancelled) return
        if ('error' in data) { toast.error(data.error); setSales([]); return }
        setSales((data.sales ?? []) as unknown as Sale[])
      } catch {
        if (!cancelled) toast.error('Failed to load sales')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function fetchSales() {
    setLoading(true)
    try {
      const data = await getSales()
      if ('error' in data) { toast.error(data.error); setSales([]); return }
      setSales((data.sales ?? []) as unknown as Sale[])
    } catch {
      toast.error('Failed to load sales')
    } finally {
      setLoading(false)
    }
  }

  const filtered = sales.filter((sale) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      sale.saleNumber.toLowerCase().includes(q) ||
      (sale.customerName ?? '').toLowerCase().includes(q) ||
      sale.items.some((item) => item.name.toLowerCase().includes(q))
    const matchesPayment =
      paymentFilter === 'all' || sale.paymentMethod === paymentFilter
    const matchesDate = isInDateRange(sale as unknown as { [k: string]: unknown }, dateRange)
    return matchesSearch && matchesPayment && matchesDate
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteSale(id)
      toast.success('Sale deleted')
      fetchSales()
    } catch {
      toast.error('Failed to delete sale')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={5} columns={7} />
      </div>
    )
  }

  if (sales.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-card to-chart-2/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Sales</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Track and manage your sales transactions in one place.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <EmptyState
          icon={Inbox}
          title="No sales yet"
          description="Create your first sale to start tracking transactions."
          action={{ label: 'New Sale', href: '/sales/new' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-card to-chart-2/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Sales</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Track and manage your sales transactions in one place.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by sale number, customer, or product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="h-10 rounded-full border border-input/60 bg-card pl-10 pr-4 shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
        </div>
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-full border border-input/60 bg-card shadow-sm sm:w-44 focus:ring-2 focus:ring-emerald-500/20">
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateFilter
          preset={datePreset}
          from={dateFrom}
          to={dateTo}
          onPresetChange={(p) => {
            setDatePreset(p)
            setCurrentPage(1)
          }}
          onFromChange={(d) => {
            setDateFrom(d)
            setCurrentPage(1)
          }}
          onToChange={(d) => {
            setDateTo(d)
            setCurrentPage(1)
          }}
          accent="emerald"
        />
        <Button asChild className="h-10 shrink-0 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700">
          <Link href="/sales/new">
            <Plus className="mr-1.5 size-4" />
            New Sale
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <DataTable
          columns={[
            {
              key: 'saleNumber',
              header: 'Sale #',
              primaryOnCard: true,
              cell: (sale: Sale) => (
                <span className="font-medium">{sale.saleNumber}</span>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              mobileLabel: 'Customer',
              cell: (sale: Sale) => sale.customerName,
            },
            {
              key: 'items',
              header: 'Items',
              mobileLabel: 'Items',
              hideOnMobileCard: false,
              cell: (sale: Sale) => sale.items.length,
            },
            {
              key: 'total',
              header: 'Total',
              mobileLabel: 'Total',
              cell: (sale: Sale) => (
                <span className="font-semibold text-emerald-600">{formatCurrency(sale.total)}</span>
              ),
            },
            {
              key: 'paymentMethod',
              header: 'Payment',
              mobileLabel: 'Paid via',
              cell: (sale: Sale) => (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  <span className={cn('h-1.5 w-1.5 rounded-full', PAYMENT_DOT[sale.paymentMethod] ?? 'bg-gray-400')} />
                  {sale.paymentMethod.replace('_', ' ')}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              mobileLabel: 'Date',
              cell: (sale: Sale) => formatDate(sale.createdAt),
            },
            {
              key: 'actions',
              header: '',
              className: 'w-[60px]',
              cell: (sale: Sale) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl shadow-xl">
                    <DropdownMenuItem className="gap-2" onClick={() => router.push(`/sales/${sale.id}`)}>
                      <Eye className="size-4 text-muted-foreground" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() =>
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(`Sale ${sale.saleNumber} - Total: ${formatCurrency(sale.total)}`)}%0A${window.location.origin}/r/${(sale as { publicToken?: string }).publicToken ?? sale.saleNumber}`,
                          '_blank'
                        )
                      }
                    >
                      <Share2 className="size-4 text-muted-foreground" />
                      Share WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => window.open(`/api/r/${(sale as { publicToken?: string }).publicToken ?? sale.saleNumber}/pdf`, '_blank')}>
                      <Download className="size-4 text-muted-foreground" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() => handleDelete(sale.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
          data={paginated}
          keyExtractor={(sale) => sale.id}
          onRowClick={(sale) => router.push(`/sales/${sale.id}`)}
          renderCardActions={(sale) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl shadow-xl">
                <DropdownMenuItem className="gap-2" onClick={() => router.push(`/sales/${sale.id}`)}>
                  <Eye className="size-4 text-muted-foreground" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Sale ${sale.saleNumber} - Total: ${formatCurrency(sale.total)}`)}%0A${window.location.origin}/r/${(sale as { publicToken?: string }).publicToken ?? sale.saleNumber}`,
                      '_blank'
                    )
                  }
                >
                  <Share2 className="size-4 text-muted-foreground" />
                  Share WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => window.open(`/api/r/${(sale as { publicToken?: string }).publicToken ?? sale.saleNumber}/pdf`, '_blank')}>
                  <Download className="size-4 text-muted-foreground" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => handleDelete(sale.id)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-9 rounded-full border-border/60 shadow-sm"
            >
              <ChevronLeft className="mr-1 size-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'h-9 min-w-[2.25rem] rounded-full px-3',
                    page === currentPage
                      ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                      : 'border-border/60 shadow-sm'
                  )}
                >
                  {page}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 sm:hidden">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    page === currentPage ? 'w-6 bg-emerald-600' : 'w-2.5 bg-muted-foreground/30'
                  )}
                  aria-label={`Go to page ${page}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-9 rounded-full border-border/60 shadow-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
