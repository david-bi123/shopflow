'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Edit,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  Inbox,
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
import { getInvoices, deleteInvoice } from '@/lib/actions/invoice-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Invoice, InvoiceStatus } from '@/lib/validations/invoice'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES: Record<InvoiceStatus, { dot: string; bg: string; label: string }> = {
  draft:    { dot: 'bg-slate-400',  bg: 'bg-slate-100',  label: 'text-slate-700' },
  sent:     { dot: 'bg-blue-500',   bg: 'bg-blue-100',   label: 'text-blue-700' },
  paid:     { dot: 'bg-emerald-500', bg: 'bg-emerald-100', label: 'text-emerald-700' },
  overdue:  { dot: 'bg-rose-500',   bg: 'bg-rose-100',   label: 'text-rose-700' },
  cancelled:{ dot: 'bg-gray-400',   bg: 'bg-gray-100',   label: 'text-gray-700' },
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
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={5} columns={7} />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-blue-500/10 via-card to-sky-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Invoices</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Create, send and track invoices to your customers.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
        </div>
        <EmptyState
          icon={Inbox}
          title="No invoices yet"
          description="Create your first invoice to start billing customers."
          action={{ label: 'New Invoice', href: '/invoices/new' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-blue-500/10 via-card to-sky-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Invoices</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create, send and track invoices to your customers.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="h-10 rounded-full border border-input/60 bg-card pl-10 pr-4 shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-blue-500/20"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-full border border-input/60 bg-card shadow-sm sm:w-44 focus:ring-2 focus:ring-blue-500/20">
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
        <Button asChild className="h-10 shrink-0 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700">
          <Link href="/invoices/new">
            <Plus className="mr-1.5 size-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
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
              cell: (inv: Invoice) => (
                <span className="font-semibold text-blue-600">{formatCurrency(inv.total)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (inv: Invoice) => {
                const style = STATUS_STYLES[inv.status]
                return (
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', style?.bg, style?.label)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', style?.dot)} />
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                )
              },
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
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl shadow-xl">
                    <DropdownMenuItem className="gap-2" onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <Eye className="size-4 text-muted-foreground" />
                      View
                    </DropdownMenuItem>
                    {(inv.status === 'draft' || inv.status === 'sent') && (
                      <DropdownMenuItem className="gap-2" onClick={() => router.push(`/invoices/${inv.id}?edit=true`)}>
                        <Edit className="size-4 text-muted-foreground" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="gap-2" onClick={() => toast.info('Email sending coming soon')}>
                      <Send className="size-4 text-muted-foreground" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() =>
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(`Invoice ${inv.invoiceNumber} - Total: ${formatCurrency(inv.total)}`)}`,
                          '_blank'
                        )
                      }
                    >
                      <Share2 className="size-4 text-muted-foreground" />
                      Share WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => window.open(`/api/i/${inv.invoiceNumber}/pdf`, '_blank')}>
                      <Download className="size-4 text-muted-foreground" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() => handleDelete(inv.id)}
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
          keyExtractor={(inv) => inv.id}
          onRowClick={(inv) => router.push(`/invoices/${inv.id}`)}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'h-9 min-w-[2.25rem] rounded-full px-3',
                    page === currentPage
                      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                      : 'border-border/60 shadow-sm'
                  )}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-9 rounded-full border-border/60 shadow-sm"
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
