'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Store,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Ban,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Calendar,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils/format'
import type { Column } from '@/components/shared/data-table'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  subscriptionStatus: string
  subscriptionPlan?: string
  createdAt: string
}

interface TenantDetail extends Tenant {
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    status: string
    lastLogin: string | null
    createdAt: string
  }>
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  suspended: 'destructive',
  rejected: 'outline',
}

const statusOptions = ['All', 'Active', 'Pending', 'Suspended', 'Rejected']

export default function AdminShopsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [detailTarget, setDetailTarget] = useState<TenantDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedSearch])

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const { getTenants } = await import('@/lib/actions/admin-actions')
      const result = await getTenants(page, 20, statusFilter || undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTenants(result.tenants as unknown as Tenant[])
      setTotalPages(result.pagination!.totalPages)
      setTotal(result.pagination!.total)
      setStats((prev) => ({ ...prev, total: result.pagination!.total }))
    } catch {
      toast.error('Failed to load shops')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  useEffect(() => {
    async function fetchStats() {
      try {
        const { getPlatformStats } = await import('@/lib/actions/admin-actions')
        const result = await getPlatformStats()
        if (!result.error) {
          setStats({
            total: result.totalTenants ?? 0,
            active: result.activeTenants ?? 0,
            pending: result.pendingTenants ?? 0,
          })
        }
      } catch {}
    }
    fetchStats()
  }, [])

  async function handleStatusChange(id: string, status: 'pending' | 'active' | 'suspended' | 'rejected') {
    setActionLoading(id)
    try {
      const { updateTenantStatus } = await import('@/lib/actions/admin-actions')
      const result = await updateTenantStatus(id, status)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Shop ${status} successfully`)
      fetchTenants()
    } catch {
      toast.error('Failed to update shop status')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const { updateTenantStatus } = await import('@/lib/actions/admin-actions')
      const result = await updateTenantStatus(deleteTarget.id, 'rejected')
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Shop deleted successfully')
      setDeleteTarget(null)
      fetchTenants()
    } catch {
      toast.error('Failed to delete shop')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredTenants = tenants.filter((t) =>
    debouncedSearch
      ? t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true
  )

  async function handleViewDetail(tenant: Tenant) {
    setDetailLoading(true)
    try {
      const { getTenantDetails } = await import('@/lib/actions/admin-actions')
      const result = await getTenantDetails(tenant.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDetailTarget(result as unknown as TenantDetail)
    } catch {
      toast.error('Failed to load shop details')
    } finally {
      setDetailLoading(false)
    }
  }

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Shop Name',
      cell: (t) => (
        <div className="cursor-pointer" onClick={() => handleViewDetail(t)}>
          <p className="font-medium hover:text-primary transition-colors">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.slug}</p>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      cell: (t) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.slug}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => (
        <Badge variant={statusColors[t.status] ?? 'outline'}>
          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'subscription',
      header: 'Subscription',
      cell: (t) => (
        <div className="text-sm">
          <p className="capitalize">{t.subscriptionStatus}</p>
          {t.subscriptionPlan && (
            <p className="text-xs text-muted-foreground capitalize">{t.subscriptionPlan}</p>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (t) => <span className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (t) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              handleViewDetail(t)
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {t.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={actionLoading === t.id}
              onClick={(e) => {
                e.stopPropagation()
                handleStatusChange(t.id, 'active')
              }}
            >
              {actionLoading === t.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Approve
            </Button>
          )}
          {t.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={actionLoading === t.id}
              onClick={(e) => {
                e.stopPropagation()
                handleStatusChange(t.id, 'suspended')
              }}
            >
              {actionLoading === t.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Ban className="h-3 w-3" />
              )}
              Suspend
            </Button>
          )}
          {(t.status === 'suspended' || t.status === 'rejected') && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={actionLoading === t.id}
              onClick={(e) => {
                e.stopPropagation()
                handleStatusChange(t.id, 'active')
              }}
            >
              {actionLoading === t.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UserCheck className="h-3 w-3" />
              )}
              Reinstate
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            disabled={actionLoading === t.id}
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(t)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Shops" description="Manage all shops on the platform">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops..."
            className="w-60 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Shops
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        {statusOptions.map((opt) => (
          <Button
            key={opt}
            variant={statusFilter === (opt === 'All' ? '' : opt.toLowerCase()) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(opt === 'All' ? '' : opt.toLowerCase())}
          >
            {opt}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No shops found"
          description={debouncedSearch ? 'Try a different search term' : 'No shops have been registered yet'}
        />
      ) : (
        <>
          <DataTable columns={columns} data={filteredTenants} keyExtractor={(t) => t.id} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shop</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              will reject the shop and prevent further access. This can be undone by reinstating the
              shop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailTarget ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  {detailTarget.name}
                </DialogTitle>
                <DialogDescription>
                  Detailed information about this shop
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Slug
                    </p>
                    <code className="rounded bg-muted px-2 py-1 text-sm">{detailTarget.slug}</code>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Status
                    </p>
                    <Badge variant={statusColors[detailTarget.status] ?? 'outline'}>
                      {detailTarget.status.charAt(0).toUpperCase() + detailTarget.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Subscription</p>
                    <p className="text-sm capitalize">
                      {detailTarget.subscriptionStatus}
                      {detailTarget.subscriptionPlan ? ` · ${detailTarget.subscriptionPlan}` : ''}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created
                    </p>
                    <p className="text-sm">{formatDate(detailTarget.createdAt, 'long')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Users ({detailTarget.users.length})
                  </p>
                  {detailTarget.users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users associated with this shop</p>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border p-2">
                      {detailTarget.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                            <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{u.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
