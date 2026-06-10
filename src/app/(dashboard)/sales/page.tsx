'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, Trash2, Eye, Download, Share2 } from 'lucide-react'

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
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { getSales, deleteSale } from '@/lib/actions/sale-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { Sale } from '@/lib/validations/sale'

const PAYMENT_METHODS = [
  { value: 'all', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_BADGES: Record<string, 'default' | 'secondary' | 'outline'> = {
  cash: 'default',
  card: 'secondary',
  mobile_money: 'outline',
  bank_transfer: 'secondary',
  other: 'outline',
}

const ITEMS_PER_PAGE = 10

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchSales = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const filtered = sales.filter((sale) => {
    const matchesSearch =
      sale.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (sale.customerName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesPayment =
      paymentFilter === 'all' || sale.paymentMethod === paymentFilter
    return matchesSearch && matchesPayment
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
    return <LoadingSkeleton rows={5} columns={7} />
  }

  if (sales.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sales" description="Manage your sales transactions">
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="mr-2 size-4" />
              New Sale
            </Link>
          </Button>
        </PageHeader>
        <EmptyState
          icon={Search}
          title="No sales yet"
          description="Create your first sale to start tracking transactions."
          action={{ label: 'New Sale', href: '/sales/new' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Manage your sales transactions">
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="mr-2 size-4" />
            New Sale
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by sale number or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
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
      </div>

      <DataTable
        columns={[
          {
            key: 'saleNumber',
            header: 'Sale #',
            cell: (sale: Sale) => (
              <span className="font-medium">{sale.saleNumber}</span>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (sale: Sale) => sale.customerName,
          },
          {
            key: 'items',
            header: 'Items',
            cell: (sale: Sale) => sale.items.length,
          },
          {
            key: 'total',
            header: 'Total',
            cell: (sale: Sale) => formatCurrency(sale.total),
          },
          {
            key: 'paymentMethod',
            header: 'Payment',
            cell: (sale: Sale) => (
              <Badge variant={PAYMENT_BADGES[sale.paymentMethod] ?? 'outline'}>
                {sale.paymentMethod.replace('_', ' ')}
              </Badge>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            cell: (sale: Sale) => formatDate(sale.createdAt),
          },
          {
            key: 'actions',
            header: '',
            className: 'w-[60px]',
            cell: (sale: Sale) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/sales/${sale.id}`)}>
                    <Eye className="mr-2 size-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`Sale ${sale.saleNumber} - Total: ${formatCurrency(sale.total)}`)}`,
                        '_blank'
                      )
                    }
                  >
                    <Share2 className="mr-2 size-4" />
                    Share WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('PDF download coming soon')}>
                    <Download className="mr-2 size-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(sale.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
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
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
