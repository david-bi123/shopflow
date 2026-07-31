'use client'

import { useEffect, useState } from 'react'
import {
  Save,
  Loader2,
  AlertCircle,
  Globe,
  Receipt,
  CreditCard,
  Store as StoreIcon,
  Settings as SettingsIcon,
  Check,
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
import { formatCurrency } from '@/lib/utils/format'

interface TaxLine {
  name: string
  rate: number
  enabled: boolean
}

interface Settings {
  storeName: string
  storePhone: string
  storeEmail: string
  storeAddress: string
  storeDescription?: string | null
  taxNumber?: string | null
  logo: string | null
  currency: string
  timezone: string
  taxRate: number
  taxes: TaxLine[]
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
  storeDescription: '',
  taxNumber: '',
  logo: null,
  currency: 'GHS',
  timezone: 'UTC',
  taxRate: 0,
  taxes: [
    { name: 'VAT', rate: 15, enabled: true },
    { name: 'NHIS', rate: 2.5, enabled: false },
    { name: 'GET Fund', rate: 2.5, enabled: false },
  ],
  receiptFooter: 'Thank you for your business!',
  showLogoOnReceipt: true,
  showQrOnReceipt: true,
  defaultPaymentMethods: ['cash', 'mobile_money'],
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loadedSettings, setLoadedSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = loadedSettings !== null && JSON.stringify(settings) !== JSON.stringify(loadedSettings)

  useEffect(() => {
    let cancelled = false
    async function fetchSettings() {
      try {
        const { getSettings } = await import('@/lib/actions/settings-actions')
        const result = await getSettings()
        if (cancelled) return
        if ('error' in result) {
          setError(result.error as string)
          return
        }
        const data = result.settings as unknown as Partial<Settings>
        const next = { ...defaultSettings, ...data }
        setSettings(next)
        setLoadedSettings(next)
      } catch {
        if (!cancelled) setError('Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSettings()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const { updateSettings } = await import('@/lib/actions/settings-actions')
      const res = await updateSettings(settings as unknown as Parameters<typeof updateSettings>[0])
      if ('error' in res && res.error) {
        toast.error(res.error as string)
        return
      }
      setLoadedSettings(settings)
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
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Manage your store configuration</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 sm:w-auto"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          {dirty && !saving && <Check className="ml-1 h-4 w-4" />}
        </Button>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-blue-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <StoreIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Store Information</CardTitle>
              <p className="text-xs text-muted-foreground">Public details shown on receipts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                placeholder="My Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxNumber">Tax / GRA ID</Label>
              <Input
                id="taxNumber"
                value={settings.taxNumber ?? ''}
                onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                placeholder="TIN-0001234567"
              />
              <p className="text-[11px] text-muted-foreground">Printed on every receipt</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeDescription">Description</Label>
            <Textarea
              id="storeDescription"
              value={settings.storeDescription ?? ''}
              onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })}
              placeholder="e.g. Trendy women’s fashion & accessories, Est. 2018"
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">Shown under the store name on receipts</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storePhone">Phone</Label>
              <Input
                id="storePhone"
                value={settings.storePhone}
                onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                placeholder="+233 24 555 0101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail">Email</Label>
              <Input
                id="storeEmail"
                type="email"
                value={settings.storeEmail}
                onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
                placeholder="store@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Address</Label>
            <Textarea
              id="storeAddress"
              value={settings.storeAddress}
              onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
              placeholder="21 Oxford Street, Osu, Accra, Ghana"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-violet-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Globe className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Currency &amp; Timezone</CardTitle>
              <p className="text-xs text-muted-foreground">GHS is the default. Switch anytime.</p>
            </div>
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
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.symbol} ({c.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sample: {formatCurrency(1234.56, settings.currency)}
            </p>
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
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-amber-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Receipt className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Tax &amp; Receipt</CardTitle>
              <p className="text-xs text-muted-foreground">Tax rate and what customers see on receipts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tax Lines</Label>
              <span className="text-xs text-muted-foreground">Toggle to enable per-transaction</span>
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {(settings.taxes ?? []).map((t, idx) => (
                <div
                  key={t.name}
                  className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center"
                >
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => {
                      const next = [...(settings.taxes ?? [])]
                      next[idx] = { ...t, enabled: v }
                      setSettings({ ...settings, taxes: next })
                    }}
                    aria-label={`Toggle ${t.name}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">Ghana Revenue Authority levy</p>
                  </div>
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="h-9 pr-7 text-right text-sm"
                      value={t.rate}
                      onChange={(e) => {
                        const next = [...(settings.taxes ?? [])]
                        next[idx] = { ...t, rate: parseFloat(e.target.value) || 0 }
                        setSettings({ ...settings, taxes: next })
                      }}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Defaults: VAT 15%, NHIS 2.5%, GET Fund 2.5%. Add or edit more here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer Message</Label>
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

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Payment Methods</CardTitle>
              <p className="text-xs text-muted-foreground">Default options shown when recording sales</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.value}
                htmlFor={`pm-${pm.value}`}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30 hover:border-primary/30"
              >
                <Checkbox
                  id={`pm-${pm.value}`}
                  checked={settings.defaultPaymentMethods.includes(pm.value)}
                  onCheckedChange={() => togglePaymentMethod(pm.value)}
                />
                <span className="text-sm font-medium">{pm.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25"
            size="lg"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}
