'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Share2, Send, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getInvoiceById,
  updateInvoiceStatus,
  deleteInvoice,
} from '@/lib/actions/invoice-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Invoice, InvoiceStatus } from '@/lib/validations/invoice'

const STATUS_BADGES: Record<InvoiceStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  sent: 'default',
  paid: 'secondary',
  overdue: 'destructive',
  cancelled: 'outline',
}

const NEXT_STATUSES: Record<InvoiceStatus, { label: string; status: InvoiceStatus }[]> = {
  draft: [{ label: 'Mark as Sent', status: 'sent' }],
  sent: [
    { label: 'Mark as Paid', status: 'paid' },
    { label: 'Mark as Overdue', status: 'overdue' },
    { label: 'Cancel Invoice', status: 'cancelled' },
  ],
  paid: [],
  overdue: [
    { label: 'Mark as Paid', status: 'paid' },
    { label: 'Cancel Invoice', status: 'cancelled' },
  ],
  cancelled: [],
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getInvoiceById(params.id as string)
        if (!data) {
          setError('Invoice not found')
          return
        }
        setInvoice((data as { invoice: Invoice }).invoice)
      } catch {
        setError('Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return
    try {
      await updateInvoiceStatus((invoice as any).id, newStatus)
      setInvoice({ ...invoice, status: newStatus })
      toast.success(`Invoice status updated to ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteInvoice(params.id as string)
      toast.success('Invoice deleted')
      router.push('/invoices')
    } catch {
      toast.error('Failed to delete invoice')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-lg text-destructive">{error ?? 'Invoice not found'}</p>
        <Button asChild>
          <Link href="/invoices">Back to Invoices</Link>
        </Button>
      </div>
    )
  }

  const nextStatuses = NEXT_STATUSES[invoice.status]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/invoices">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <Badge variant={STATUS_BADGES[invoice.status]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
          <p className="ml-10 text-sm text-muted-foreground">
            Created on {formatDate(invoice.createdAt)}
            {' | '}Due on {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.length > 0 && (
            <Select onValueChange={(v) => handleStatusChange(v as InvoiceStatus)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                {nextStatuses.map((ns) => (
                  <SelectItem key={ns.status} value={ns.status}>
                    {ns.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Email sending coming soon')}
          >
            <Send className="mr-2 size-4" />
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(
                  `Invoice ${invoice.invoiceNumber} - Customer: ${invoice.customerName} - Total: ${formatCurrency(invoice.total)} - Due: ${formatDate(invoice.dueDate)}`
                )}`,
                '_blank'
              )
            }
          >
            <Share2 className="mr-2 size-4" />
            Share WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('PDF download coming soon')}
          >
            <Download className="mr-2 size-4" />
            Download PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{invoice.customerName}</span>
            </div>
            {invoice.customerEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{invoice.customerEmail}</span>
              </div>
            )}
            {invoice.customerPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{invoice.customerPhone}</span>
              </div>
            )}
            {invoice.customerAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{invoice.customerAddress}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={STATUS_BADGES[invoice.status]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>+{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
