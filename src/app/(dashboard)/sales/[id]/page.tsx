'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Share2, Trash2 } from 'lucide-react'

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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getSaleById, deleteSale } from '@/lib/actions/sale-actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Sale } from '@/lib/validations/sale'

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-lg text-destructive">{error ?? 'Sale not found'}</p>
        <Button asChild>
          <Link href="/sales">Back to Sales</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/sales">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {sale.saleNumber}
            </h1>
          </div>
          <p className="ml-10 text-sm text-muted-foreground">
            Created on {formatDate(sale.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(
                  `Sale ${sale.saleNumber} - Customer: ${sale.customerName} - Total: ${formatCurrency(sale.total)}`
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
              <span className="font-medium">{sale.customerName}</span>
            </div>
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <Badge variant="outline">
                {sale.paymentMethod.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>+{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
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
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sale.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
