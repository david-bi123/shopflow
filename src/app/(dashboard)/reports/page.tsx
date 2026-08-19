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
  TrendingDown,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Clock,
  ChevronDown,
  Percent,
  HandCoins,
  CreditCard,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer } from '@/components/shared/chart-container'
import { DateInput } from '@/components/shared/date-input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

interface SalesReportData {
  totalRevenue: number
  totalSales: number
  averageSale: number
  totalUnits: number
  totalDiscount: number
  totalTax: number
  collected: number
  outstanding: number
  collectionRate: number
  revenueGrowth: number
  salesGrowth: number
  prevRevenue: number
  prevSales: number
  paymentBreakdown: {
    paidFullCount: number
    paidFullAmount: number
    paidPartialCount: number
    paidPartialAmount: number
    unpaidCount: number
    unpaidAmount: number
  }
  chartData: Array<{
    label: string
    revenue: number
    sales: number
    collected: number
    outstanding: number
    units: number
  }>
  weekdayData: Array<{ label: string; revenue: number; sales: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number; share: number }>
  topCustomers: Array<{ name: string; count: number; revenue: number; outstanding: number }>
}

interface ProductReportData {
  totalRevenue: number
  totalSales: number
  totalUnits: number
  productCount: number
  topProduct: string | null
  products: Array<{
    name: string
    quantity: number
    revenue: number
    share: number
    avgPrice: number
    salesCount: number
  }>
}

interface StaffReportData {
  totalRevenue: number
  totalSales: number
  outstanding: number
  activeStaff: number
  staff: Array<{
    userId: number
    name: string
    salesCount: number
    revenue: number
    average: number
    outstanding: number
  }>
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

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { start: string; end: string } {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { start: toDateStr(now), end: toDateStr(now) }
    case 'week': {
      const s = new Date(now)
      s.setDate(s.getDate() - s.getDay())
      s.setHours(0, 0, 0, 0)
      return { start: toDateStr(s), end: toDateStr(now) }
    }
    case 'month':
      return { start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: toDateStr(now) }
    case 'year':
      return { start: toDateStr(new Date(now.getFullYear(), 0, 1)), end: toDateStr(now) }
    default:
      return {
        start: customFrom || toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: customTo || toDateStr(now),
      }
  }
}

function compactNum(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return `${Math.round(v)}`
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function RankBadge({ index }: { index: number }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1',
        index === 0
          ? 'bg-amber-100 text-amber-700 ring-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300'
          : index === 1
            ? 'bg-slate-200 text-slate-700 ring-slate-300/60 dark:bg-slate-800 dark:text-slate-300'
            : index === 2
              ? 'bg-orange-100 text-orange-800 ring-orange-300/60 dark:bg-orange-950/60 dark:text-orange-300'
              : 'bg-muted text-muted-foreground ring-border',
      )}
    >
      {index + 1}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delta,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
  delta?: number
}) {
  return (
    <Card className="group relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-60 blur-3xl"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)` }}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </p>
            <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {delta !== undefined && (
              <div className="flex items-center gap-1">
                {delta === 0 ? (
                  <span className="text-[11px] text-muted-foreground">Flat vs previous period</span>
                ) : (
                  <>
                    {delta > 0 ? (
                      <TrendingUp className="size-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="size-3 text-rose-500" />
                    )}
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        delta > 0 ? 'text-emerald-600' : 'text-rose-500',
                      )}
                    >
                      {Math.abs(delta).toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">vs prev</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 25%, transparent)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentCard({
  icon: Icon,
  title,
  count,
  amount,
  color,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  count: number
  amount: number
  color: string
  subtitle?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 25%, transparent)`,
            }}
          >
            <Icon className="size-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(amount)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {count} sale{count === 1 ? '' : 's'}
              {subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ShareCell({ value, color = 'var(--chart-1)' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{value.toFixed(1)}%</span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SalesTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const valueOf = (key: string) => payload.find((p: { dataKey?: string }) => p.dataKey === key)?.value ?? 0
  return (
    <div className="rounded-xl border border-border/60 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur dark:bg-zinc-900/95 dark:shadow-black/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(valueOf('revenue'))}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
          <span className="text-muted-foreground">Collected:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(valueOf('collected'))}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-5)' }} />
          <span className="text-muted-foreground">Outstanding:</span>
          <span className="font-semibold tabular-nums">{formatCurrency(valueOf('outstanding'))}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">Sales:</span>
          <span className="font-semibold tabular-nums">{String(valueOf('sales'))}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">Units:</span>
          <span className="font-semibold tabular-nums">{String(valueOf('units'))}</span>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WeekdayTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border border-border/60 bg-white/95 p-3 shadow-lg shadow-slate-200/50 backdrop-blur dark:bg-zinc-900/95 dark:shadow-black/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
        {formatCurrency(entry.value)}
      </p>
      <p className="text-xs text-muted-foreground">{entry.payload?.sales ?? 0} sales</p>
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
        <p className="mb-5 max-w-sm text-center text-sm text-muted-foreground">{description}</p>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-sm">
          <Clock className="h-3 w-3" />
          Coming Soon
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales')
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null)
  const [productReport, setProductReport] = useState<ProductReportData | null>(null)
  const [staffReport, setStaffReport] = useState<StaffReportData | null>(null)

  useEffect(() => {
    const range = computeRange(datePreset, customFrom, customTo)
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const actions = await import('@/lib/actions/report-actions')
        if (activeTab === 'sales') {
          const data = await actions.getSalesReport(range.start, range.end)
          if ('error' in data) {
            setError(data.error as string)
            return
          }
          if (!cancelled) setSalesReport(data as unknown as SalesReportData)
        } else if (activeTab === 'product') {
          const data = await actions.getProductReport(range.start, range.end)
          if ('error' in data) {
            setError(data.error as string)
            return
          }
          if (!cancelled) setProductReport(data as unknown as ProductReportData)
        } else if (activeTab === 'staff') {
          const data = await actions.getStaffReport(range.start, range.end)
          if ('error' in data) {
            setError(data.error as string)
            return
          }
          if (!cancelled) setStaffReport(data as unknown as StaffReportData)
        }
      } catch {
        if (!cancelled) setError('Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeTab, datePreset, customFrom, customTo])

  const range = computeRange(datePreset, customFrom, customTo)

  function handleExport(format: 'csv' | 'excel' | 'pdf') {
    if (format !== 'csv') {
      toast.success(`${format.toUpperCase()} export coming soon!`)
      return
    }
    if (activeTab === 'sales' && salesReport) {
      downloadCSV(
        `sales-report-${range.start}-to-${range.end}.csv`,
        ['Date', 'Revenue', 'Sales', 'Units', 'Collected', 'Outstanding'],
        salesReport.chartData.map((d) => [
          d.label,
          d.revenue,
          d.sales,
          d.units,
          d.collected,
          d.outstanding,
        ]),
      )
    } else if (activeTab === 'product' && productReport) {
      downloadCSV(
        `product-report-${range.start}-to-${range.end}.csv`,
        ['Product', 'Sales', 'Units Sold', 'Avg Price', 'Revenue', 'Share %'],
        productReport.products.map((p) => [
          p.name,
          p.salesCount,
          p.quantity,
          p.avgPrice,
          p.revenue,
          p.share,
        ]),
      )
    } else if (activeTab === 'staff' && staffReport) {
      downloadCSV(
        `staff-report-${range.start}-to-${range.end}.csv`,
        ['Staff', 'Sales', 'Avg Sale', 'Revenue', 'Outstanding'],
        staffReport.staff.map((s) => [s.name, s.salesCount, s.average, s.revenue, s.outstanding]),
      )
    } else {
      toast.error('No data to export yet')
      return
    }
    toast.success('CSV downloaded')
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

  const s = salesReport

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
                {range.start === range.end
                  ? `Showing data for ${range.start}`
                  : `Showing data from ${range.start} to ${range.end}`}
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

      {/* Date controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setDatePreset(preset.key)}
              className={cn(
                'relative whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-all duration-200',
                datePreset === preset.key
                  ? 'bg-white text-foreground shadow-sm ring-border/60 dark:bg-zinc-800'
                  : 'bg-muted/50 text-muted-foreground ring-border/40 hover:text-foreground',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </p>
              <DateInput
                id="report-from"
                value={customFrom}
                onChange={setCustomFrom}
                className="h-9 w-36"
                aria-label="Report start date"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To
              </p>
              <DateInput
                id="report-to"
                value={customTo}
                onChange={setCustomTo}
                min={customFrom || undefined}
                className="h-9 w-36"
                aria-label="Report end date"
              />
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="product">Product Report</TabsTrigger>
            <TabsTrigger value="staff">Staff Report</TabsTrigger>
            <TabsTrigger value="invoice">Invoice Report</TabsTrigger>
          </TabsList>
        </div>

        {/* ============================ SALES ============================ */}
        <TabsContent value="sales" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-80 rounded-2xl" />
              </div>
            </div>
          ) : s ? (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard
                  icon={DollarSign}
                  label="Total Revenue"
                  value={formatCurrency(s.totalRevenue)}
                  color="var(--chart-1)"
                  delta={s.revenueGrowth}
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Total Sales"
                  value={formatNumber(s.totalSales)}
                  color="var(--chart-2)"
                  delta={s.salesGrowth}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Average Sale"
                  value={formatCurrency(s.averageSale)}
                  color="var(--chart-3)"
                />
                <StatCard
                  icon={Package}
                  label="Units Sold"
                  value={formatNumber(s.totalUnits)}
                  color="var(--chart-4)"
                />
                <StatCard
                  icon={Percent}
                  label="Discounts Given"
                  value={formatCurrency(s.totalDiscount)}
                  color="var(--chart-5)"
                />
                <StatCard
                  icon={Receipt}
                  label="Tax Collected"
                  value={formatCurrency(s.totalTax)}
                  color="var(--chart-1)"
                />
              </div>

              {/* Payment status + collection */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <PaymentCard
                  icon={CheckCircle2}
                  title="Paid in Full"
                  count={s.paymentBreakdown.paidFullCount}
                  amount={s.paymentBreakdown.paidFullAmount}
                  color="var(--chart-2)"
                />
                <PaymentCard
                  icon={Clock}
                  title="Partially Paid"
                  count={s.paymentBreakdown.paidPartialCount}
                  amount={s.paymentBreakdown.paidPartialAmount}
                  color="var(--chart-3)"
                  subtitle={`${formatCurrency(Math.max(0, s.outstanding - s.paymentBreakdown.unpaidAmount))} still owed`}
                />
                <PaymentCard
                  icon={AlertCircle}
                  title="Unpaid"
                  count={s.paymentBreakdown.unpaidCount}
                  amount={s.paymentBreakdown.unpaidAmount}
                  color="var(--chart-5)"
                />
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25">
                          <HandCoins className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Collection Rate
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {s.collectionRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formatCurrency(s.collected)} of {formatCurrency(s.totalRevenue)}
                      </p>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, s.collectionRate)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {formatCurrency(s.outstanding)} still outstanding this period
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                    <div>
                      <CardTitle className="text-base">Revenue vs Collected</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Sales value and cash collected per day
                      </p>
                    </div>
                    <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-1" /> Revenue
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-2" /> Collected
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {s.chartData.length > 0 && s.chartData.some((d) => d.revenue > 0) ? (
                      <ChartContainer className="h-72">
                        {({ width, height }) => (
                          <AreaChart
                            width={width}
                            height={height}
                            data={s.chartData}
                            margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="reportCollectedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="stroke-border"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              minTickGap={24}
                              tickFormatter={(v: string) => {
                                const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
                                return m ? `${m[3]}/${m[2]}` : v
                              }}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => compactNum(v)}
                            />
                            <Tooltip
                              content={<SalesTooltip />}
                              cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              name="Revenue"
                              stroke="var(--chart-1)"
                              strokeWidth={2.5}
                              fill="url(#reportRevenueGradient)"
                            />
                            <Area
                              type="monotone"
                              dataKey="collected"
                              name="Collected"
                              stroke="var(--chart-2)"
                              strokeWidth={2}
                              fill="url(#reportCollectedGradient)"
                            />
                          </AreaChart>
                        )}
                      </ChartContainer>
                    ) : (
                      <div className="flex h-72 flex-col items-center justify-center text-sm text-muted-foreground">
                        <BarChart3 className="mb-2 size-8 opacity-40" />
                        <p>No sales data for this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="text-base">Weekly Pattern</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Revenue by day of the week
                    </p>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {s.weekdayData.length > 0 && s.weekdayData.some((d) => d.revenue > 0) ? (
                      <ChartContainer className="h-72">
                        {({ width, height }) => (
                          <BarChart
                            width={width}
                            height={height}
                            data={s.weekdayData}
                            margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="stroke-border"
                              vertical={false}
                            />
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
                              tickFormatter={(v) => compactNum(v)}
                            />
                            <Tooltip
                              content={<WeekdayTooltip />}
                              cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="var(--chart-3)"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        )}
                      </ChartContainer>
                    ) : (
                      <div className="flex h-72 flex-col items-center justify-center text-sm text-muted-foreground">
                        <Clock className="mb-2 size-8 opacity-40" />
                        <p>No sales data for this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top products & customers */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="text-base">Top Products</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">Best sellers by revenue</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {s.topProducts.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {s.topProducts.map((p, i) => {
                          const max = s.topProducts[0]?.revenue || 1
                          return (
                            <div key={p.name} className="relative px-5 py-3.5">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-chart-1/5 to-transparent"
                                style={{ width: `${(p.revenue / max) * 100}%` }}
                              />
                              <div className="relative flex items-center gap-3">
                                <RankBadge index={i} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {p.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatNumber(p.quantity)} sold · {p.share.toFixed(1)}% of revenue
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                  {formatCurrency(p.revenue)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-sm text-muted-foreground">
                        <Package className="mb-2 size-8 opacity-40" />
                        <p>No products sold this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="text-base">Top Customers</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">Highest spending customers</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {s.topCustomers.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {s.topCustomers.map((c, i) => (
                          <div key={c.name} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(c.count)} sale{c.count === 1 ? '' : 's'} · Rank #{i + 1}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold tabular-nums text-foreground">
                                {formatCurrency(c.revenue)}
                              </p>
                              {c.outstanding > 0 && (
                                <p className="text-[11px] font-medium text-rose-500">
                                  {formatCurrency(c.outstanding)} owed
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-sm text-muted-foreground">
                        <Users className="mb-2 size-8 opacity-40" />
                        <p>No customers this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ============================ PRODUCT ============================ */}
        <TabsContent value="product" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          ) : productReport ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={DollarSign}
                  label="Total Revenue"
                  value={formatCurrency(productReport.totalRevenue)}
                  color="var(--chart-1)"
                />
                <StatCard
                  icon={Package}
                  label="Products Sold"
                  value={formatNumber(productReport.productCount)}
                  color="var(--chart-2)"
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Units Sold"
                  value={formatNumber(productReport.totalUnits)}
                  color="var(--chart-3)"
                />
                <StatCard
                  icon={Award}
                  label="Top Product"
                  value={
                    <span className="truncate text-lg">{productReport.topProduct ?? '—'}</span>
                  }
                  color="var(--chart-4)"
                />
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                  <div>
                    <CardTitle className="text-base">Product Breakdown</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Every product sold, ranked by revenue
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(productReport.products.length)} products
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {productReport.products.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Sales</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Avg Price</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="w-44">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productReport.products.map((p, i) => (
                            <TableRow key={p.name}>
                              <TableCell className="text-xs text-muted-foreground">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-medium">{p.name}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(p.salesCount)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(p.quantity)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(p.avgPrice)}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                                {formatCurrency(p.revenue)}
                              </TableCell>
                              <TableCell>
                                <ShareCell
                                  value={p.share}
                                  color={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-12 text-sm text-muted-foreground">
                      <Package className="mb-2 size-8 opacity-40" />
                      <p>No products sold this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ============================ STAFF ============================ */}
        <TabsContent value="staff" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          ) : staffReport ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={DollarSign}
                  label="Total Revenue"
                  value={formatCurrency(staffReport.totalRevenue)}
                  color="var(--chart-1)"
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Total Sales"
                  value={formatNumber(staffReport.totalSales)}
                  color="var(--chart-2)"
                />
                <StatCard
                  icon={CreditCard}
                  label="Outstanding"
                  value={formatCurrency(staffReport.outstanding)}
                  color="var(--chart-5)"
                />
                <StatCard
                  icon={Users}
                  label="Active Staff"
                  value={formatNumber(staffReport.activeStaff)}
                  color="var(--chart-3)"
                />
              </div>

              <Card>
                <CardHeader className="border-b border-border/60">
                  <CardTitle className="text-base">Sales by Team Member</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Revenue attributed to each staff member
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {staffReport.staff.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead className="text-right">Sales</TableHead>
                            <TableHead className="text-right">Avg Sale</TableHead>
                            <TableHead className="w-56">Revenue</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffReport.staff.map((st, i) => {
                            const max = staffReport.staff[0]?.revenue || 1
                            return (
                              <TableRow key={st.userId}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border">
                                      {st.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium">{st.name}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        Rank #{i + 1}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatNumber(st.salesCount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(st.average)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${(st.revenue / max) * 100}%`,
                                          backgroundColor:
                                            CHART_COLORS[i % CHART_COLORS.length],
                                        }}
                                      />
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                                      {formatCurrency(st.revenue)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {st.outstanding > 0 ? (
                                    <span className="text-rose-500">{formatCurrency(st.outstanding)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-12 text-sm text-muted-foreground">
                      <Users className="mb-2 size-8 opacity-40" />
                      <p>No staff recorded sales this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ============================ INVOICE ============================ */}
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