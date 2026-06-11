'use client'

import { useEffect, useState } from 'react'
import {
  Store,
  CheckCircle2,
  Clock,
  ShoppingCart,
  FileText,
  DollarSign,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  pendingTenants: number
  totalSales: number
  totalInvoices: number
  totalRevenue: number
}

interface GrowthData {
  month: string
  count: number
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [growth, setGrowth] = useState<GrowthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ getPlatformStats }, { getTenantGrowth }] = await Promise.all([
          import('@/lib/actions/admin-actions'),
          import('@/lib/actions/admin-actions'),
        ])
        const [statsResult, growthResult] = await Promise.all([
          getPlatformStats(),
          getTenantGrowth(),
        ])
        if (statsResult.error) {
          setError(statsResult.error)
          return
        }
        setStats(statsResult as PlatformStats)
        setGrowth(growthResult.growth ?? [])
      } catch {
        setError('Failed to load platform statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      title: 'Total Tenants',
      value: formatNumber(stats?.totalTenants ?? 0),
      icon: Store,
      gradient: 'from-blue-500/10 to-blue-500/5',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Shops',
      value: formatNumber(stats?.activeTenants ?? 0),
      icon: CheckCircle2,
      gradient: 'from-emerald-500/10 to-emerald-500/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Pending Approvals',
      value: formatNumber(stats?.pendingTenants ?? 0),
      icon: Clock,
      gradient: 'from-amber-500/10 to-amber-500/5',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Total Sales',
      value: formatNumber(stats?.totalSales ?? 0),
      icon: ShoppingCart,
      gradient: 'from-violet-500/10 to-violet-500/5',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Total Invoices',
      value: formatNumber(stats?.totalInvoices ?? 0),
      icon: FileText,
      gradient: 'from-indigo-500/10 to-indigo-500/5',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      gradient: 'from-green-500/10 to-green-500/5',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
    },
  ]

  const growthValues = growth.map((d) => d.count)
  const maxCount = Math.max(...growthValues, 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Statistics"
        description="Overview of the entire IndFlow platform"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="relative overflow-hidden border-0 bg-gradient-to-br shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold tracking-tight">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Tenant Growth</CardTitle>
            </div>
            <p className="mt-1 text-sm text-muted-foreground ml-10">
              Monthly new tenant registrations
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatNumber(stats?.totalTenants ?? 0)}</span>
            <span className="text-muted-foreground">total</span>
          </div>
        </CardHeader>
        <CardContent>
          {growth.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No tenant growth data available</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5 }}
                    formatter={(value) => [value, 'New Tenants']}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {growth.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(var(--primary) / ${0.4 + (growth[index].count / maxCount) * 0.6})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
