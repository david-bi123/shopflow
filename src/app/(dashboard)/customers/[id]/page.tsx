'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  DollarSign,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface CustomerDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  totalSales: number
  totalRevenue: number
  createdAt: string
  recentSales: Array<{
    id: string
    saleNumber: string
    total: number
    status: string
    createdAt: string
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    total: number
    status: string
    dueDate: string
    createdAt: string
  }>
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const { getCustomerById } = await import('@/lib/actions/customer-actions')
        const result = await getCustomerById(id)
        if ('error' in result && result.error) {
          setError(result.error)
          return
        }
        const c = result.customer as unknown as CustomerDetail
        setCustomer(c)
        setEditForm({
          name: c.name || '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          address: c.address ?? '',
          notes: c.notes ?? '',
        })
      } catch {
        setError('Failed to load customer')
      } finally {
        setLoading(false)
      }
    }
    fetchCustomer()
  }, [id])

  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const { createCustomer } = await import('@/lib/actions/customer-actions')
      await createCustomer({
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        notes: editForm.notes || undefined,
      })
      toast.success('Customer updated')
      setEditOpen(false)
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: editForm.name,
              email: editForm.email || null,
              phone: editForm.phone || null,
              address: editForm.address || null,
              notes: editForm.notes || null,
            }
          : prev
      )
    } catch {
      toast.error('Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      const { deleteCustomer } = await import('@/lib/actions/customer-actions')
      await deleteCustomer(id)
      toast.success('Customer deleted')
      router.push('/customers')
    } catch {
      toast.error('Failed to delete customer')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-xl lg:col-span-1" />
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Customer not found</h2>
        <p className="mb-4 text-muted-foreground">{error ?? 'The customer does not exist'}</p>
        <Button onClick={() => router.push('/customers')}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>Update customer information</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Customer since {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>
            <Separator />
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div>
                <p className="mb-1 text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{customer.totalSales}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(customer.totalRevenue)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.recentSales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.recentSales.slice(0, 5).map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/sales/${sale.id}`)}
                      >
                        <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                        <TableCell>{formatDate(sale.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.status === 'completed'
                                ? 'default'
                                : sale.status === 'pending'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No sales yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.recentInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.recentInvoices.slice(0, 5).map((inv) => (
                      <TableRow
                        key={inv.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                      >
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(inv.createdAt)}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(inv.total)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inv.status === 'paid'
                                ? 'default'
                                : inv.status === 'overdue'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No invoices yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
