'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Store,
  Receipt,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'

interface DashboardStats {
  todaySales: number
  weeklySales: number
  monthlySales: number
  totalProducts: number
  totalSales: number
  totalInvoices: number
  totalCustomers: number
  totalStaff: number
  recentActivity: Array<{
    id: string
    action: string
    entityType: string
    entityId: string
    description: string
    user: { name: string }
    createdAt: string
  }>
  shopName: string
}

interface SalesChartData {
  date: string
  sales: number
  orders: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<SalesChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { getDashboardStats, getSalesChartData } = await import('@/lib/actions/report-actions')
        const [statsData, chart] = await Promise.all([
          getDashboardStats(),
          getSalesChartData(),
        ])
        setStats(statsData as unknown as DashboardStats)
        setChartData(chart as unknown as SalesChartData[])
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
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
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

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats?.todaySales ?? 0),
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Weekly Sales',
      value: formatCurrency(stats?.weeklySales ?? 0),
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      title: 'Monthly Sales',
      value: formatCurrency(stats?.monthlySales ?? 0),
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales ?? 0,
      icon: ShoppingCart,
    },
    {
      title: 'Invoices',
      value: stats?.totalInvoices ?? 0,
      icon: FileText,
    },
    {
      title: 'Customers',
      value: stats?.totalCustomers ?? 0,
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats?.shopName ?? 'IndFlow'} &mdash; here&apos;s your overview today
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="relative overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_0%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_60%)] opacity-70" />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 ring-1 ring-inset ring-border">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                {card.trend && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {card.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    vs last period
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Item A', sales: 120 },
                    { name: 'Item B', sales: 98 },
                    { name: 'Item C', sales: 86 },
                    { name: 'Item D', sales: 65 },
                    { name: 'Item E', sales: 42 },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Bar dataKey="sales" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/activity">
              <Activity className="mr-1 h-4 w-4" />
              View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="rounded-full bg-primary/10 p-2">
                    <Receipt className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      {activity.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-sm text-muted-foreground">
              <Activity className="mb-2 h-8 w-8" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
