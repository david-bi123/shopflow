'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Store,
  Receipt,
  Activity,
  ArrowUpRight,
  Sparkles,
  Eye,
  Package,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface DashboardStats {
  todaySales: number
  todaySalesCount: number
  weeklySales: number
  weeklySalesCount: number
  monthlySales: number
  monthlySalesCount: number
  totalSalesCount: number
  totalInvoices: number
  totalCustomers: number
  totalStaff: number
  topProducts: Array<{ name: string; total: number; revenue: number }>
  shopName: string
}

interface SalesChartData {
  date: string
  sales: number
  orders: number
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  entityId: string
  performedByName: string
  details: { description?: string } | null
  createdAt: string
}

function formatShortDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  sale: ShoppingCart,
  invoice: FileText,
  customer: Users,
  staff: Users,
  default: Receipt,
}

const ACTIVITY_COLOR: Record<string, string> = {
  sale: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40',
  invoice: 'bg-blue-100 text-blue-700 ring-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800/40',
  customer: 'bg-violet-100 text-violet-700 ring-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/40',
  staff: 'bg-amber-100 text-amber-700 ring-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/40',
  default: 'bg-slate-100 text-slate-700 ring-slate-200/60 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800/40',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur dark:bg-zinc-900/95 dark:shadow-black/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums text-foreground">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<SalesChartData[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { getDashboardStats, getSalesChartData, getActivities } = await import('@/lib/actions/report-actions')
        const [statsData, chart, activityData] = await Promise.all([
          getDashboardStats(),
          getSalesChartData(),
          getActivities(5),
        ])
        setStats(statsData as unknown as DashboardStats)
        setChartData(chart as unknown as SalesChartData[])
        if (!('error' in activityData)) {
          setActivities(activityData.activities as unknown as ActivityItem[])
        }
      } catch {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-5">
          Try Again
        </Button>
      </div>
    )
  }

  // Find max revenue in top products for bar widths
  const maxTopProductRevenue = Math.max(...(stats?.topProducts?.map((p) => p.revenue) ?? [1]), 1)

  return (
    <div className="space-y-6">
      {/* Hero / Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-chart-2/10 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-chart-2/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-border/60 dark:bg-zinc-900/60">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {stats?.shopName ?? 'IndFlow'} Dashboard
                </p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="bg-white/80 dark:bg-zinc-900/60">
              <Link href="/sales/new">
                <Receipt className="mr-2 size-4" />
                New Sale
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/invoices/new">
                <FileText className="mr-2 size-4" />
                New Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales - hero card */}
        <Card className="relative overflow-hidden sm:col-span-2 lg:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_0%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_60%)] opacity-80" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Today&apos;s Revenue
              </p>
              <CardTitle className="mt-0.5 text-sm font-medium text-muted-foreground">
                Live performance
              </CardTitle>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
              <DollarSign className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(stats?.todaySales ?? 0)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40">
                <TrendingUp className="mr-1 size-3" />
                Active
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stats?.todaySalesCount ?? 0} {stats?.todaySalesCount === 1 ? 'sale' : 'sales'} today
              </span>
            </div>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-chart-2/10 blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                This Week
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10 ring-1 ring-inset ring-chart-2/20">
              <TrendingUp className="size-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(stats?.weeklySales ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats?.weeklySalesCount ?? 0} {stats?.weeklySalesCount === 1 ? 'sale' : 'sales'}
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-chart-3/10 blur-2xl" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                This Month
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10 ring-1 ring-inset ring-chart-3/20">
              <TrendingUp className="size-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(stats?.monthlySales ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats?.monthlySalesCount ?? 0} {stats?.monthlySalesCount === 1 ? 'sale' : 'sales'}
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                <ShoppingCart className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Sales
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {stats?.totalSalesCount ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 ring-1 ring-inset ring-chart-2/20">
                <FileText className="size-4 text-chart-2" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoices
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {stats?.totalInvoices ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10 ring-1 ring-inset ring-chart-3/20">
                <Users className="size-4 text-chart-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customers
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {stats?.totalCustomers ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10 ring-1 ring-inset ring-chart-4/20">
                <Package className="size-4 text-chart-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Staff
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {stats?.totalStaff ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and side cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-base">Sales Trend</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Revenue over the last 30 days</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports">
                <ArrowUpRight className="mr-1 size-3" />
                Full report
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-5">
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => {
                        const parsed = new Date(v)
                        if (!isNaN(parsed.getTime())) return formatShortDate(v)
                        return v
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#salesGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center text-sm text-muted-foreground">
                <Activity className="mb-2 size-8 opacity-40" />
                <p>No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-base">Top Items</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Best sellers by revenue</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <div className="divide-y divide-border/60">
                {stats.topProducts.slice(0, 5).map((product, i) => {
                  const pct = (product.revenue / maxTopProductRevenue) * 100
                  return (
                    <div key={product.name} className="relative px-5 py-3.5">
                      {/* progress bar background */}
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/5 to-transparent"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ${
                            i === 0
                              ? 'bg-amber-100 text-amber-700 ring-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300'
                              : i === 1
                              ? 'bg-slate-200 text-slate-700 ring-slate-300/60 dark:bg-slate-800 dark:text-slate-300'
                              : i === 2
                              ? 'bg-orange-100 text-orange-800 ring-orange-300/60 dark:bg-orange-950/60 dark:text-orange-300'
                              : 'bg-muted text-muted-foreground ring-border'
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.total} sold</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center text-sm text-muted-foreground">
                <Package className="mb-2 size-8 opacity-40" />
                <p>No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
          <div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest events across your shop</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/activity">
              <Eye className="mr-2 size-4" />
              View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length > 0 ? (
            <div className="divide-y divide-border/60">
              {activities.map((activity) => {
                const entityKey = (activity.entity || 'default').toLowerCase()
                const Icon = ACTIVITY_ICON[entityKey] ?? ACTIVITY_ICON.default
                const colorClass = ACTIVITY_COLOR[entityKey] ?? ACTIVITY_COLOR.default
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/40 dark:hover:bg-zinc-900/30"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${colorClass}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{activity.performedByName}</span>{' '}
                        <span className="text-muted-foreground">
                          {activity.details?.description ?? activity.action}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-sm text-muted-foreground">
              <Activity className="mb-2 size-8 opacity-40" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
