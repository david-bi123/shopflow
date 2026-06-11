'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
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
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-fuchsia-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-fuchsia-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Customers</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage your customer directory and view their purchase history.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="rounded-xl shadow-sm">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-fuchsia-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <Users className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Customers</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your customer directory and view their purchase history.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-full border border-input/60 bg-card pl-10 pr-4 shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-violet-500/20"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 shrink-0 rounded-full bg-violet-600 text-white shadow-md hover:bg-violet-700">
              <Plus className="mr-1.5 size-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl border-border/60 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <DialogHeader className="pt-2">
              <DialogTitle className="text-xl">Add Customer</DialogTitle>
              <DialogDescription>Add a new customer to your directory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                  className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                  className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St"
                  className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/20 resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl border-border/60 shadow-sm">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="rounded-xl bg-violet-600 text-white shadow-md hover:bg-violet-700">
                {creating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Create Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {paginated.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <EmptyState
            icon={Users}
            title={search ? 'No customers found' : 'No customers yet'}
            description={search ? 'Try a different search term' : 'Add your first customer to get started'}
            action={!search ? { label: 'Add Customer', onClick: () => setDialogOpen(true) } : undefined}
          />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  primaryOnCard: true,
                  cell: (customer: Customer) => (
                    <span className="font-medium">{customer.name}</span>
                  ),
                },
                {
                  key: 'phone',
                  header: 'Phone',
                  mobileLabel: 'Phone',
                  cell: (customer: Customer) => (
                    <span className="text-muted-foreground">{customer.phone ?? '—'}</span>
                  ),
                },
                {
                  key: 'email',
                  header: 'Email',
                  mobileLabel: 'Email',
                  cell: (customer: Customer) => (
                    <span className="text-muted-foreground">{customer.email ?? '—'}</span>
                  ),
                },
                {
                  key: 'totalSales',
                  header: 'Sales',
                  mobileLabel: 'Sales',
                  cell: (customer: Customer) => (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {customer.totalSales}
                    </span>
                  ),
                },
                {
                  key: 'totalRevenue',
                  header: 'Revenue',
                  mobileLabel: 'Revenue',
                  cell: (customer: Customer) => (
                    <span className="font-semibold text-violet-600">{formatCurrency(customer.totalRevenue)}</span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-[80px]',
                  cell: (customer: Customer) => (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/customers/${customer.id}`)
                        }}
                      >
                        <FileText className="size-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(customer.id)
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={paginated}
              keyExtractor={(customer) => customer.id}
              onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
              renderCardActions={(customer) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(customer.id)
                  }}
                  aria-label={`Delete ${customer.name}`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-9 rounded-full border-border/60 shadow-sm"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                className="h-9 rounded-full border-border/60 shadow-sm"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
