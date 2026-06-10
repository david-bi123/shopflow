'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Receipt,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

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
        let endDate = now
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
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="mr-1 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <FileText className="mr-1 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            variant={datePreset === preset.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDatePreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="product">Product Report</TabsTrigger>
          <TabsTrigger value="staff">Staff Report</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Report</TabsTrigger>
        </TabsList>

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
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                      <span className="text-2xl font-bold">
                        {formatCurrency(report.totalRevenue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{report.totalSales}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Sale
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-chart-2" />
                      <span className="text-2xl font-bold">
                        {formatCurrency(report.averageSale)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={report.chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                          }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                            }}
                          />
                          <Bar dataKey="quantity" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                            label={({ name, percent }: any) =>
                              `${name ?? ''} ${((Number(percent) || 0) * 100).toFixed(0)}%`
                            }
                          >
                            {report.paymentMethods.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                            }}
                          />
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
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">Product Report</h3>
              <p className="text-sm text-muted-foreground">
                Detailed product performance data coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">Staff Report</h3>
              <p className="text-sm text-muted-foreground">
                Staff performance analytics coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">Invoice Report</h3>
              <p className="text-sm text-muted-foreground">
                Invoice analytics coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
