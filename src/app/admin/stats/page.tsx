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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency } from '@/lib/utils/format'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  pendingTenants: number
  totalSales: number
  totalInvoices: number
  totalRevenue: number
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { getPlatformStats } = await import('@/lib/actions/admin-actions')
        const result = await getPlatformStats()
        if (result.error) {
          setError(result.error)
          return
        }
        setStats(result as PlatformStats)
      } catch {
        setError('Failed to load platform statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
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
      value: stats?.totalTenants ?? 0,
      icon: Store,
      color: 'text-blue-600',
    },
    {
      title: 'Active Shops',
      value: stats?.activeTenants ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pendingTenants ?? 0,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales ?? 0,
      icon: ShoppingCart,
      color: 'text-violet-600',
    },
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices ?? 0,
      icon: FileText,
      color: 'text-indigo-600',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Statistics"
        description="Overview of the entire ShopFlow platform"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
