'use client'

import { useEffect, useState } from 'react'
import {
  Save,
  Loader2,
  AlertCircle,
  Store,
  Globe,
  Receipt,
  CreditCard,
  Upload,
  Settings2,
  Building2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, TIMEZONES, PAYMENT_METHODS } from '@/lib/utils/constants'

interface Settings {
  storeName: string
  storePhone: string
  storeEmail: string
  storeAddress: string
  logo: string | null
  currency: string
  timezone: string
  taxRate: number
  receiptFooter: string
  showLogoOnReceipt: boolean
  showQrOnReceipt: boolean
  defaultPaymentMethods: string[]
}

const defaultSettings: Settings = {
  storeName: '',
  storePhone: '',
  storeEmail: '',
  storeAddress: '',
  logo: null,
  currency: 'GHS',
  timezone: 'UTC',
  taxRate: 0,
  receiptFooter: '',
  showLogoOnReceipt: true,
  showQrOnReceipt: true,
  defaultPaymentMethods: [],
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { getSettings } = await import('@/lib/actions/settings-actions')
        const result = await getSettings()
        if ('error' in result) return
        const data = result.settings
        setSettings({ ...defaultSettings, ...(data as unknown as Partial<Settings>) })
      } catch {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const { updateSettings } = await import('@/lib/actions/settings-actions')
      await updateSettings(settings as any)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function togglePaymentMethod(method: string) {
    setSettings((prev) => ({
      ...prev,
      defaultPaymentMethods: prev.defaultPaymentMethods.includes(method)
        ? prev.defaultPaymentMethods.filter((m) => m !== method)
        : [...prev.defaultPaymentMethods, method],
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex h-9 w-48 items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-32" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your store configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-blue-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-base">Store Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone">Phone</Label>
              <Input
                id="storePhone"
                value={settings.storePhone}
                onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail">Email</Label>
              <Input
                id="storeEmail"
                type="email"
                value={settings.storeEmail}
                onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Address</Label>
              <Input
                id="storeAddress"
                value={settings.storeAddress}
                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <Button variant="outline" disabled>
                <Upload className="mr-1 h-4 w-4" />
                Upload Logo
              </Button>
              <span className="text-sm text-muted-foreground">
                Logo upload coming soon
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-violet-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Globe className="h-4 w-4 text-violet-600" />
            </div>
            <CardTitle className="text-base">Currency &amp; Timezone</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={settings.currency}
              onValueChange={(v) => setSettings({ ...settings, currency: v })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c: { code: string; name: string; symbol: string }) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.symbol} ({c.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(v) => setSettings({ ...settings, timezone: v })}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz: string) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-amber-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Receipt className="h-4 w-4 text-amber-600" />
            </div>
            <CardTitle className="text-base">Tax &amp; Receipt</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.taxRate}
                onChange={(e) =>
                  setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer</Label>
            <Textarea
              id="receiptFooter"
              value={settings.receiptFooter}
              onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              placeholder="Thank you for your business!"
              rows={3}
            />
          </div>
          <Separator className="bg-primary/5" />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <div>
                <Label htmlFor="showLogo">Show logo on receipt</Label>
                <p className="text-xs text-muted-foreground">
                  Display your store logo on printed receipts
                </p>
              </div>
              <Switch
                id="showLogo"
                checked={settings.showLogoOnReceipt}
                onCheckedChange={(v) => setSettings({ ...settings, showLogoOnReceipt: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <div>
                <Label htmlFor="showQR">Show QR code on receipt</Label>
                <p className="text-xs text-muted-foreground">
                  Display a QR code on printed receipts
                </p>
              </div>
              <Switch
                id="showQR"
                checked={settings.showQrOnReceipt}
                onCheckedChange={(v) => setSettings({ ...settings, showQrOnReceipt: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAYMENT_METHODS.map((pm) => (
              <div key={pm.value} className="flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30">
                <Checkbox
                  id={`pm-${pm.value}`}
                  checked={settings.defaultPaymentMethods.includes(pm.value)}
                  onCheckedChange={() => togglePaymentMethod(pm.value)}
                />
                <Label htmlFor={`pm-${pm.value}`} className="cursor-pointer text-sm font-medium">
                  {pm.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
