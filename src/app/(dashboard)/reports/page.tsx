'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

interface SalesReportData {
  totalRevenue: number
  totalSales: number
  averageSale: number
  chartData: Array<{ label: string; revenue: number; sales: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  paymentMethods: Array<{ method: string; count: number; total: number }>
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function KPICard({
  icon: Icon,
  label,
  value,
  chartColor,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  chartColor: string
}) {
  return (
    <Card className="group relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-60 blur-3xl"
        style={{ backgroundColor: `color-mix(in oklab, ${chartColor} 15%, transparent)` }}
      />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          </div>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: `color-mix(in oklab, ${chartColor} 12%, transparent)`,
              borderColor: `color-mix(in oklab, ${chartColor} 25%, transparent)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: chartColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur dark:bg-zinc-900/95 dark:shadow-black/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry: { name?: string; value?: number; color?: string; payload?: { revenue?: number } }, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color ?? CHART_COLORS[idx % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold tabular-nums">
              {entry.name === 'revenue' || entry.name === 'total'
                ? formatCurrency(entry.value ?? 0)
                : entry.value ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border border-border/60 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur dark:bg-zinc-900/95 dark:shadow-black/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Quantity: <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Revenue:{' '}
        <span className="font-semibold tabular-nums text-foreground">
          {entry.payload?.revenue != null ? formatCurrency(entry.payload.revenue) : '-'}
        </span>
      </p>
    </div>
  )
}

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card className="relative overflow-hidden border border-dashed border-muted-foreground/15 bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-chart-1/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-chart-2/5 blur-3xl" />
      <CardContent className="relative flex flex-col items-center py-20">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-chart-2/10 ring-1 ring-inset ring-primary/10">
          <Icon className="h-9 w-9 text-primary/70" />
        </div>
        <h3 className="mb-1 text-xl font-semibold text-foreground">{title}</h3>
        <p className="mb-5 max-w-sm text-center text-sm text-muted-foreground">
          {description}
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-sm">
          <Clock className="h-3 w-3" />
          Coming Soon
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<SalesReportData | null>(null)

  useEffect(() => {
    async function fetchReport() {
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        let startDate: Date
        const endDate = now
        switch (datePreset) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - startDate.getDay())
            startDate.setHours(0, 0, 0, 0)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        const { getSalesReport } = await import('@/lib/actions/report-actions')
        const data = await getSalesReport(startDate.toISOString(), endDate.toISOString())
        if ('error' in data) {
          setError(data.error as string)
          return
        }
        setReport(data as unknown as SalesReportData)
      } catch {
        setError('Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [datePreset])

  function handleExport(format: 'csv' | 'excel' | 'pdf') {
    toast.success(`${format.toUpperCase()} export coming soon!`)
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

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-chart-1/10 via-card to-chart-2/10 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-chart-1/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-chart-2/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-border/60 dark:bg-zinc-900/60">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Analytics
                </p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Track your business performance and sales metrics.
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white/80 dark:bg-zinc-900/60">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Segmented date preset buttons */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/50 p-0.5 shadow-sm">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.key}
              onClick={() => setDatePreset(preset.key)}
              className={cn(
                'relative whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
                datePreset === preset.key
                  ? 'bg-white text-foreground shadow-sm ring-1 ring-border/60 dark:bg-zinc-800'
                  : 'text-muted-foreground hover:text-foreground',
                idx === 0 && 'rounded-r-none',
                idx === PRESETS.length - 1 && 'rounded-l-none',
                idx > 0 && idx < PRESETS.length - 1 && 'rounded-none'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="sales">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="product">Product Report</TabsTrigger>
            <TabsTrigger value="staff">Staff Report</TabsTrigger>
            <TabsTrigger value="invoice">Invoice Report</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : report ? (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <KPICard
                  icon={DollarSign}
                  label="Total Revenue"
                  value={formatCurrency(report.totalRevenue)}
                  chartColor="var(--chart-2)"
                />
                <KPICard
                  icon={ShoppingCart}
                  label="Total Sales"
                  value={report.totalSales}
                  chartColor="var(--chart-1)"
                />
                <KPICard
                  icon={TrendingUp}
                  label="Average Sale"
                  value={formatCurrency(report.averageSale)}
                  chartColor="var(--chart-3)"
                />
              </div>

              {/* Revenue Trend */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                  <div>
                    <CardTitle className="text-base">Revenue Trend</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Revenue over the selected period
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={report.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis
                          dataKey="label"
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
                          content={<ChartTooltip />}
                          cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--chart-1)"
                          strokeWidth={2.5}
                          fill="url(#reportRevenueGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Products */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                    <div>
                      <CardTitle className="text-base">Top Products</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Best sellers by quantity
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                          />
                          <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--primary)', opacity: 0.05 }} />
                          <Bar
                            dataKey="quantity"
                            fill="var(--chart-1)"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                    <div>
                      <CardTitle className="text-base">Payment Methods</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Breakdown by transaction count
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={report.paymentMethods}
                            dataKey="count"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }: { name?: string; percent?: number }) =>
                              `${name ?? ''} ${((Number(percent) || 0) * 100).toFixed(0)}%`
                            }
                          >
                            {report.paymentMethods.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="product" className="space-y-6">
          <ComingSoonCard
            icon={Package}
            title="Product Report"
            description="Detailed product performance data coming soon. Track top sellers, inventory turnover, and profit margins."
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <ComingSoonCard
            icon={Users}
            title="Staff Report"
            description="Staff performance analytics coming soon. Monitor sales by team member and efficiency metrics."
          />
        </TabsContent>

        <TabsContent value="invoice" className="space-y-6">
          <ComingSoonCard
            icon={Receipt}
            title="Invoice Report"
            description="Invoice analytics coming soon. Analyze payment status, aging, and collection rates."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
