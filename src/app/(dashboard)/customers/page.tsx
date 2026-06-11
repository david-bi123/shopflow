'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/format'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  totalSales: number
  totalRevenue: number
  createdAt: string
}

const PAGE_SIZE = 10

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { getCustomers } = await import('@/lib/actions/customer-actions')
        const data = await getCustomers(page, PAGE_SIZE, search)
        if ('error' in data && data.error) {
          setError(data.error)
          return
        }
        setCustomers(data.customers as unknown as Customer[])
      } catch {
        setError('Failed to load customers')
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [page, search])

  const paginated = customers

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setCreating(true)
    try {
      const { createCustomer } = await import('@/lib/actions/customer-actions')
      await createCustomer({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Customer created')
      setDialogOpen(false)
      setForm({ name: '', email: '', phone: '', address: '', notes: '' })
      const { getCustomers: refetch } = await import('@/lib/actions/customer-actions')
      const refreshed = await refetch(page, PAGE_SIZE, search)
      if (!('error' in refreshed)) {
        setCustomers(refreshed.customers as unknown as Customer[])
      }
    } catch {
      toast.error('Failed to create customer')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      const { deleteCustomer } = await import('@/lib/actions/customer-actions')
      await deleteCustomer(id)
      toast.success('Customer deleted')
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error('Failed to delete customer')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>Add a new customer to your directory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
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
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {paginated.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No customers found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {search ? 'Try a different search term' : 'Add your first customer to get started'}
            </p>
            {!search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone ?? '—'}</TableCell>
                    <TableCell>{customer.email ?? '—'}</TableCell>
                    <TableCell>{customer.totalSales}</TableCell>
                    <TableCell>{formatCurrency(customer.totalRevenue)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/customers/${customer.id}`)
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(customer.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
