'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, Trash2, Eye, Download, Share2, Edit, Send } from 'lucide-react'

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
import { getInvoices, deleteInvoice } from '@/lib/actions/invoice-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { Invoice, InvoiceStatus } from '@/lib/validations/invoice'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_BADGES: Record<InvoiceStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  sent: 'default',
  paid: 'secondary',
  overdue: 'destructive',
  cancelled: 'outline',
}

const ITEMS_PER_PAGE = 10

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoices()
      if (!('error' in data)) {
        setInvoices(data.invoices as unknown as Invoice[])
      }
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice(id)
      toast.success('Invoice deleted')
      fetchInvoices()
    } catch {
      toast.error('Failed to delete invoice')
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={5} columns={7} />
  }

  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoices" description="Manage your invoices">
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 size-4" />
              New Invoice
            </Link>
          </Button>
        </PageHeader>
        <EmptyState
          icon={Search}
          title="No invoices yet"
          description="Create your first invoice to start billing customers."
          action={{ label: 'New Invoice', href: '/invoices/new' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Manage your invoices">
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 size-4" />
            New Invoice
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: 'invoiceNumber',
            header: 'Invoice #',
            cell: (inv: Invoice) => (
              <span className="font-medium">{inv.invoiceNumber}</span>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (inv: Invoice) => inv.customerName,
          },
          {
            key: 'total',
            header: 'Total',
            cell: (inv: Invoice) => formatCurrency(inv.total),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (inv: Invoice) => (
              <Badge variant={STATUS_BADGES[inv.status]}>
                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
              </Badge>
            ),
          },
          {
            key: 'dueDate',
            header: 'Due Date',
            cell: (inv: Invoice) => formatDate(inv.dueDate),
          },
          {
            key: 'actions',
            header: '',
            className: 'w-[60px]',
            cell: (inv: Invoice) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <Eye className="mr-2 size-4" />
                    View
                  </DropdownMenuItem>
                  {(inv.status === 'draft' || inv.status === 'sent') && (
                    <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}?edit=true`)}>
                      <Edit className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => toast.info('Email sending coming soon')}>
                    <Send className="mr-2 size-4" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`Invoice ${inv.invoiceNumber} - Total: ${formatCurrency(inv.total)}`)}`,
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
                    onClick={() => handleDelete(inv.id)}
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
        keyExtractor={(inv) => inv.id}
        onRowClick={(inv) => router.push(`/invoices/${inv.id}`)}
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
