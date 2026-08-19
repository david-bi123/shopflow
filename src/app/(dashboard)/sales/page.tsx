'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Check,
  Link2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { BulkShareDialog } from '@/components/sales/bulk-share-dialog'

const ITEMS_PER_PAGE = 10

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [shareOpen, setShareOpen] = useState(false)

  const dateRange = useDateRange(datePreset, dateFrom, dateTo)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getSales(1, 1000)
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
      const data = await getSales(1, 1000)
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
    const matchesCustomer =
      customerFilter === 'all' || (sale.customerName ?? '') === customerFilter
    const matchesDate = isInDateRange(
      { createdAt: sale.saleDate ?? sale.createdAt } as unknown as { [k: string]: unknown },
      dateRange
    )
    return matchesSearch && matchesCustomer && matchesDate
  })

  const customerOptions = Array.from(
    new Set(sales.map((s) => s.customerName).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b))

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePageSelection = () => {
    const pageIds = paginated.map((s) => s.id)
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPage) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((s) => s.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedSales = useMemo(
    () => sales.filter((s) => selectedIds.has(s.id)),
    [sales, selectedIds]
  )

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">Sales</h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-500/20">
                {sales.length} total
              </span>
            </div>
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
          value={customerFilter}
          onValueChange={(v) => {
            setCustomerFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-full border border-input/60 bg-card shadow-sm sm:w-44 focus:ring-2 focus:ring-emerald-500/20">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customerOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
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

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1.5 size-4" />
              Clear
            </Button>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedIds.size}</span> selected
            </p>
            {selectedIds.size < filtered.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                className="rounded-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-300"
              >
                <Check className="mr-1.5 size-4" />
                Select all {filtered.length}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShareOpen(true)}
              className="rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
            >
              <Link2 className="mr-1.5 size-4" />
              Share
            </Button>
          </div>
        </div>
      )}

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
              hideBelow: 'lg',
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
              key: 'amountOwed',
              header: 'Amount Owing',
              mobileLabel: 'Owing',
              cell: (sale: Sale) => (
                sale.amountOwed > 0.005 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/40">
                    {formatCurrency(sale.amountOwed)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40">
                    Paid
                  </span>
                )
              ),
            },
            {
              key: 'date',
              header: 'Date',
              mobileLabel: 'Date',
              hideBelow: 'lg',
              cell: (sale: Sale) => formatDate(sale.saleDate ?? sale.createdAt),
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
          selectedKeys={Array.from(selectedIds)}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={togglePageSelection}
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

      {/* Share selected sales as links or a combined PDF */}
      <BulkShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        sales={selectedSales.map((s) => ({
          id: s.id,
          saleNumber: s.saleNumber,
          publicToken: (s as { publicToken?: string }).publicToken,
        }))}
      />
    </div>
  )
}
