'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Store,
  Clock,
  ShoppingCart,
  FileText,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
  Megaphone,
  ArrowUpRight,
  Building2,
  ShieldCheck,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils/format'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  pendingTenants: number
  suspendedTenants: number
  totalSales: number
  totalInvoices: number
  totalRevenue: number
  totalUsers: number
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  performedByName: string
  createdAt: string
  details: { description?: string } | null
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { getPlatformStats, getRecentPlatformActivity } = await import('@/lib/actions/admin-actions')
        const [statsResult, activityResult] = await Promise.all([
          getPlatformStats(),
          getRecentPlatformActivity(8),
        ])
        if (cancelled) return
        if (!statsResult.error) setStats(statsResult as PlatformStats)
        if (Array.isArray(activityResult)) setActivities(activityResult as unknown as ActivityItem[])
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = [
    {
      title: 'Total Shops',
      value: formatNumber(stats?.totalTenants ?? 0),
      icon: Building2,
      href: '/admin/shops',
      gradient: 'from-blue-500/10 to-blue-500/0',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Shops',
      value: formatNumber(stats?.activeTenants ?? 0),
      icon: ShieldCheck,
      href: '/admin/shops?status=active',
      gradient: 'from-emerald-500/10 to-emerald-500/0',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Pending',
      value: formatNumber(stats?.pendingTenants ?? 0),
      icon: Clock,
      href: '/admin/shops?status=pending',
      gradient: 'from-amber-500/10 to-amber-500/0',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Suspended',
      value: formatNumber(stats?.suspendedTenants ?? 0),
      icon: Store,
      href: '/admin/shops?status=suspended',
      gradient: 'from-red-500/10 to-red-500/0',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600',
    },
    {
      title: 'Total Sales',
      value: formatNumber(stats?.totalSales ?? 0),
      icon: ShoppingCart,
      gradient: 'from-violet-500/10 to-violet-500/0',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Total Invoices',
      value: formatNumber(stats?.totalInvoices ?? 0),
      icon: FileText,
      gradient: 'from-indigo-500/10 to-indigo-500/0',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      gradient: 'from-green-500/10 to-green-500/0',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
    },
    {
      title: 'Total Users',
      value: formatNumber(stats?.totalUsers ?? 0),
      icon: Users,
      gradient: 'from-pink-500/10 to-pink-500/0',
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">High-level metrics across all shops on IndFlow</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          const CardInner = (
            <Card className={`relative h-full overflow-hidden border-0 bg-gradient-to-br shadow-sm transition-all hover:shadow-md ${k.gradient}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {k.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.iconBg}`}>
                  <Icon className={`h-4 w-4 ${k.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
              </CardContent>
            </Card>
          )
          return k.href ? (
            <Link key={k.title} href={k.href} className="block">
              {CardInner}
            </Link>
          ) : (
            <div key={k.title}>{CardInner}</div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                Recent Platform Activity
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Latest events across all tenants</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <Activity className="mb-2 size-7 opacity-40" />
                No recent activity
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-semibold">{a.performedByName}</span>{' '}
                        <span className="text-muted-foreground">
                          {a.details?.description ?? a.action}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Megaphone className="h-3.5 w-3.5 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <Button asChild className="w-full justify-between shadow-lg shadow-primary/20">
              <Link href="/admin/shops?create=1">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Create New Shop
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/admin/shops">
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Manage Shops
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/admin/announcements">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Post Announcement
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/admin/stats">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  View Statistics
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
