'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Share2,
  Send,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hash,
  FileText,
  Receipt,
  ReceiptText,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  CircleX,
  AlertTriangle,
  HandCoins,
  Printer,
  Copy,
  Check,
  Pencil,
  Save,
  X as XIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

const STATUS_META: Record<
  InvoiceStatus,
  { label: string; icon: React.ElementType; className: string; bgClass: string; borderClass: string }
> = {
  paid: {
    label: 'Paid',
    icon: CircleCheck,
    className: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderClass: 'ring-emerald-200/60 dark:ring-emerald-800/40',
  },
  sent: {
    label: 'Sent',
    icon: CircleAlert,
    className: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    borderClass: 'ring-blue-200/60 dark:ring-blue-800/40',
  },
  draft: {
    label: 'Draft',
    icon: CircleDashed,
    className: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-900/60',
    borderClass: 'ring-slate-200/60 dark:ring-slate-800/40',
  },
  overdue: {
    label: 'Overdue',
    icon: CircleAlert,
    className: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 dark:bg-red-950/60',
    borderClass: 'ring-red-200/60 dark:ring-red-800/40',
  },
  cancelled: {
    label: 'Cancelled',
    icon: CircleX,
    className: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-900/60',
    borderClass: 'ring-slate-200/60 dark:ring-slate-800/40',
  },
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
  const [copied, setCopied] = useState(false)

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
      await updateInvoiceStatus((invoice as unknown as { id: string }).id, newStatus)
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

  const handleCopyLink = async () => {
    if (!invoice) return
    const url = `${window.location.origin}/i/${invoice.invoiceNumber}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Invoice link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <ReceiptText className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">{error ?? 'Invoice not found'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The invoice you&apos;re looking for doesn&apos;t exist or was removed.
        </p>
        <Button asChild className="mt-5">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 size-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>
    )
  }

  const nextStatuses = NEXT_STATUSES[invoice.status]
  const status = STATUS_META[invoice.status]
  const StatusIcon = status.icon

  // Days until due / overdue
  const dueDate = new Date(invoice.dueDate)
  const now = new Date()
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = diffDays < 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled'

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" asChild className="shrink-0 bg-white/80 dark:bg-zinc-900/60">
              <Link href="/invoices">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Invoice
                </p>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${status.bgClass} ${status.className} ${status.borderClass}`}
                >
                  <StatusIcon className="size-3" />
                  {status.label}
                </div>
                {isOverdue && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/40">
                    <CircleAlert className="size-3" />
                    {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'day' : 'days'} overdue
                  </div>
                )}
                {(invoice.amountOwed ?? 0) > 0.005 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/40">
                    <AlertTriangle className="size-3" />
                    Owes {formatCurrency(invoice.amountOwed)}
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  Issued {formatDate(invoice.createdAt)}
                </span>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  Due {formatDate(invoice.dueDate)}
                </span>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1">
                  <Hash className="size-3" />
                  {invoice.items.length} {invoice.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {nextStatuses.length > 0 && (
              <Select onValueChange={(v) => handleStatusChange(v as InvoiceStatus)}>
                <SelectTrigger className="w-44 bg-white/80 dark:bg-zinc-900/60">
                  <SelectValue placeholder="Update Status" />
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
              onClick={handleCopyLink}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              {copied ? <Check className="mr-2 size-4 text-emerald-500" /> : <Copy className="mr-2 size-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Email sending coming soon')}
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Send className="mr-2 size-4" />
              Email
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
              className="bg-white/80 dark:bg-zinc-900/60"
            >
              <Share2 className="mr-2 size-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/i/${invoice.invoiceNumber}/pdf`, '_blank')}
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
              <Link href={`/invoices/${invoice.id}/edit`}>
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
                <p className="truncate text-sm font-semibold text-foreground">{invoice.customerName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 ring-1 ring-inset ring-chart-2/20">
                <Mail className="size-4 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {invoice.customerEmail || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10 ring-1 ring-inset ring-chart-3/20">
                <Phone className="size-4 text-chart-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {invoice.customerPhone || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`overflow-hidden ${
            isOverdue
              ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20'
              : 'bg-gradient-to-br from-primary/5 to-chart-2/5'
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${
                  isOverdue
                    ? 'bg-red-100/80 text-red-700 ring-red-200/60 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-primary/10 text-primary ring-primary/20'
                }`}
              >
                <Receipt className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Due
                </p>
                <p className="truncate text-base font-bold tabular-nums text-foreground">
                  {formatCurrency(invoice.total)}
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
                Line Items
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {invoice.items.length} {invoice.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {invoice.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/40 dark:hover:bg-zinc-900/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.total)}
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
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${status.bgClass} ${status.className} ${status.borderClass}`}
              >
                <StatusIcon className="size-3" />
                {status.label}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Issued</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatDate(invoice.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Due</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount{invoice.discountPercent > 0 ? ` (${invoice.discountPercent.toFixed(2)}%)` : ''}
                </span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  −{formatCurrency(invoice.discount)}
                </span>
              </div>
            )}
            {invoice.taxItems && invoice.taxItems.length > 0 ? (
              invoice.taxItems.map((t) => (
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
              invoice.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums text-foreground">
                    +{formatCurrency(invoice.tax)}
                  </span>
                </div>
              )
            )}
            <Separator className="my-2" />
            <div className="flex items baseline justify-between rounded-xl bg-primary/5 p-3 ring-1 ring-inset ring-primary/10">
              <span className="text-sm font-semibold text-foreground">Total Due</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(invoice.amountPaid ?? invoice.total)}
              </span>
            </div>
             {(invoice.amountOwed ?? 0) > 0.005 && (
               <div className="flex items-baseline justify-between rounded-xl bg-red-50/60 p-3 ring-1 ring-inset ring-red-200/60 dark:bg-red-950/30 dark:ring-red-800/40">
                 <span className="text-sm font-semibold text-red-700 dark:text-red-300">Outstanding</span>
                 <span className="text-xl font-bold tabular-nums text-red-700 dark:text-red-300">
                   {formatCurrency(invoice.amountOwed)}
                 </span>
               </div>
             )}
           </CardContent>
         </Card>
       </div>

      {/* Customer Notes */}
      {(invoice.notes || invoice.customerAddress) && (
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {invoice.customerAddress && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Billing Address
                </p>
                <p className="flex items-start gap-2 text-sm text-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {invoice.customerAddress}
                </p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm italic text-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
