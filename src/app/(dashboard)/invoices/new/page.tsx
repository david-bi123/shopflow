'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  ArrowLeft,
  User,
  Package,
  CreditCard,
  Receipt,
  FileText,
  Percent,
  CheckCircle2,
  Building2,
  Calendar,
  HandCoins,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { createInvoiceSchema, type CreateInvoiceInput, type TaxItem } from '@/lib/validations/invoice'
import { createInvoice } from '@/lib/actions/invoice-actions'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

type FormValues = CreateInvoiceInput

const defaultItem = { name: '', description: '', quantity: 1, price: 0, total: 0 }

const DEFAULT_TAXES = [
  { name: 'VAT', rate: 15, enabled: true },
  { name: 'NHIS', rate: 2.5, enabled: true },
  { name: 'GET Fund', rate: 2.5, enabled: true },
]

export default function NewInvoicePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [currency, setCurrency] = useState('GHS')
  const [storeInfo, setStoreInfo] = useState<{
    taxes: { name: string; rate: number; enabled: boolean }[]
    storeName: string
  } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const { getSettings } = await import('@/lib/actions/settings-actions')
        const result = await getSettings()
        if (!('error' in result) && result.settings) {
          const s = result.settings as { currency: string; taxes?: { name: string; rate: number; enabled: boolean }[]; storeName: string }
          setCurrency(s.currency)
          setStoreInfo({
            taxes: s.taxes ?? DEFAULT_TAXES,
            storeName: s.storeName,
          })
        }
      } catch {
        // use defaults
      }
    }
    loadSettings()
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(createInvoiceSchema) as never,
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ ...defaultItem }],
      discountPercent: 0,
      tax: 0,
      taxItems: [],
      amountPaid: 0,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      notes: '',
    },
  })

  const { register, control, handleSubmit, formState: { errors }, watch, setValue } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const discountPercent = watch('discountPercent') || 0
  const taxItems = watch('taxItems') ?? []
  const amountPaid = watch('amountPaid') ?? 0

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  )
  const discount = (subtotal * Number(discountPercent)) / 100
  const afterDiscount = Math.max(0, subtotal - discount)

  const liveTaxItems: TaxItem[] = useMemo(() => {
    return (taxItems as TaxItem[]).map((t) => ({
      ...t,
      amount: Math.round(afterDiscount * t.rate) / 100,
    }))
  }, [afterDiscount, taxItems])

  const tax = liveTaxItems.reduce((sum, t) => sum + t.amount, 0)
  const grandTotal = afterDiscount + tax

  useEffect(() => {
    if (!storeInfo) return
    const seeded: TaxItem[] = storeInfo.taxes
      .filter((t) => t.enabled)
      .map((t) => ({ name: t.name, rate: t.rate, amount: 0 }))
    setValue('taxItems', seeded, { shouldDirty: false })
  }, [storeInfo, setValue])

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    try {
      const calculatedSubtotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
        0
      )
      const calculatedDiscount = (calculatedSubtotal * Number(discountPercent)) / 100
      const after = Math.max(0, calculatedSubtotal - calculatedDiscount)
      const calculatedTaxItems: TaxItem[] = (data.taxItems ?? []).map((t) => ({
        name: t.name,
        rate: t.rate,
        amount: Math.round(after * t.rate) / 100,
      }))
      const calculatedTax = calculatedTaxItems.reduce((sum, t) => sum + t.amount, 0)
      const calculatedTotal = after + calculatedTax
      const safeAmountPaid = Math.max(
        0,
        Math.min(calculatedTotal, Number(data.amountPaid ?? calculatedTotal) || 0)
      )

      await createInvoice({
        ...data,
        subtotal: calculatedSubtotal,
        discount: calculatedDiscount,
        tax: calculatedTax,
        taxItems: calculatedTaxItems,
        total: calculatedTotal,
        amountPaid: safeAmountPaid,
      })
      const owed = Math.max(0, Math.round((calculatedTotal - safeAmountPaid) * 100) / 100)
      if (owed > 0) {
        toast.success(`Invoice created \u2014 ${formatCurrency(owed, currency)} owed`)
      } else {
        toast.success('Invoice created successfully')
      }
      router.push('/invoices')
    } catch {
      toast.error('Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTax = (name: string) => {
    const current = (taxItems as TaxItem[]) ?? []
    const exists = current.find((t) => t.name === name)
    if (exists) {
      setValue(
        'taxItems',
        current.filter((t) => t.name !== name),
        { shouldDirty: true }
      )
    } else {
      const def = storeInfo?.taxes.find((t) => t.name === name) ?? DEFAULT_TAXES.find((t) => t.name === name)
      if (!def) return
      setValue(
        'taxItems',
        [...current, { name: def.name, rate: def.rate, amount: 0 }],
        { shouldDirty: true }
      )
    }
  }

  const setTaxRate = (name: string, rate: number) => {
    const current = (taxItems as TaxItem[]) ?? []
    setValue(
      'taxItems',
      current.map((t) => (t.name === name ? { ...t, rate } : t)),
      { shouldDirty: true }
    )
  }

  const enabledTaxNames = new Set(liveTaxItems.map((t) => t.name))
  const availableTaxes = storeInfo?.taxes ?? DEFAULT_TAXES

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`New Invoice${storeInfo ? ` \u00b7 ${storeInfo.storeName}` : ''}`}
        description="Create a new invoice for your customer"
      >
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <ArrowLeft className="mr-2 size-4" />
            Back to Invoices
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500/5 to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                {...register('customerName')}
                placeholder="Enter customer name"
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email (optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...register('customerEmail')}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone (optional)</Label>
                <Input
                  id="customerPhone"
                  {...register('customerPhone')}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Address (optional)</Label>
              <Textarea
                id="customerAddress"
                {...register('customerAddress')}
                placeholder="Enter customer address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-violet-500/5 to-transparent pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                  <Package className="h-4 w-4 text-violet-600" />
                </div>
                <CardTitle className="text-base">Invoice Items</CardTitle>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...defaultItem })}>
                <Plus className="mr-2 size-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {fields.map((field, index) => {
              const qty = Number(items[index]?.quantity) || 0
              const price = Number(items[index]?.price) || 0
              const lineTotal = qty * price

              return (
                <div key={field.id} className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`items.${index}.name`}>Item Name *</Label>
                      <Input
                        id={`items.${index}.name`}
                        {...register(`items.${index}.name`)}
                        placeholder="Item name"
                      />
                      {errors.items?.[index]?.name && (
                        <p className="text-sm text-destructive">{errors.items[index]?.name?.message}</p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="mt-6 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`items.${index}.description`}>Description (optional)</Label>
                    <Input
                      id={`items.${index}.description`}
                      {...register(`items.${index}.description`)}
                      placeholder="Brief description"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.quantity`}>Qty *</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-destructive">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.price`}>Unit Price *</Label>
                      <Input
                        id={`items.${index}.price`}
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`items.${index}.price`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.price && (
                        <p className="text-sm text-destructive">{errors.items[index]?.price?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium">
                        {formatCurrency(lineTotal, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-amber-500/5 to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dueDate"
                  type="date"
                  className="pl-10"
                  {...register('dueDate')}
                />
              </div>
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent" className="flex items-center gap-1.5">
                <Percent className="size-3.5 text-muted-foreground" />
                Discount (%)
              </Label>
              <div className="relative">
                <Input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="pr-10"
                  {...register('discountPercent', { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              {discount > 0 && (
                <p className="text-xs text-emerald-600">
                  \u2212{formatCurrency(discount, currency)} off
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  Taxes
                </Label>
                <span className="text-xs text-muted-foreground">
                  Toggle each tax on/off, edit rate inline
                </span>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                {availableTaxes.map((t) => {
                  const enabled = enabledTaxNames.has(t.name)
                  const current = liveTaxItems.find((x) => x.name === t.name)
                  return (
                    <div
                      key={t.name}
                      className={cn(
                        'flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors',
                        enabled && 'ring-1 ring-primary/30'
                      )}
                    >
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleTax(t.name)}
                        aria-label={`Toggle ${t.name}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.name}</p>
                        {enabled && current && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatCurrency(current.amount, currency)}
                          </p>
                        )}
                      </div>
                      {enabled && (
                        <div className="relative w-24">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-8 pr-7 text-right text-sm"
                            value={current?.rate ?? t.rate}
                            onChange={(e) =>
                              setTaxRate(t.name, parseFloat(e.target.value) || 0)
                            }
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!enabled && (
                        <span className="text-xs text-muted-foreground">{t.rate}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Summary</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount ({Number(discountPercent).toFixed(2)}%)</span>
                    <span className="text-destructive">-{formatCurrency(discount, currency)}</span>
                  </div>
                )}
                {liveTaxItems.length > 0 ? (
                  liveTaxItems.map((t) => (
                    <div key={t.name} className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {t.name} <span className="text-[10px] text-muted-foreground/70">({t.rate}%)</span>
                      </span>
                      <span className="text-emerald-600">+{formatCurrency(t.amount, currency)}</span>
                    </div>
                  ))
                ) : (
                  tax > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Tax</span>
                      <span className="text-emerald-600">+{formatCurrency(tax, currency)}</span>
                    </div>
                  )
                )}
                <div className="border-t border-primary/10 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrency(grandTotal, currency)}</span>
                  </div>
                </div>

                {/* Debt: amount paid + amount owed */}
                <div className="mt-3 space-y-2 rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amountPaid" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <HandCoins className="size-3.5" />
                      Amount Paid
                    </Label>
                    <button
                      type="button"
                      className="text-[10px] font-semibold uppercase tracking-wider text-primary underline-offset-2 hover:underline"
                      onClick={() => form.setValue('amountPaid', grandTotal)}
                    >
                      Pay in full
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="amountPaid"
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="0.01"
                      className="pr-12"
                      defaultValue={grandTotal}
                      {...register('amountPaid', { valueAsNumber: true })}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      GHS
                    </span>
                  </div>
                  {(() => {
                    const paid = Math.max(0, Math.min(grandTotal, Number(amountPaid) || 0))
                    const owed = Math.max(0, Math.round((grandTotal - paid) * 100) / 100)
                    return owed > 0.01 ? (
                      <div className="rounded-md border border-red-200/60 bg-red-50/60 p-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="size-3" /> Customer will owe
                          </span>
                          <span className="font-bold tabular-nums">{formatCurrency(owed, currency)}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-red-600/80 dark:text-red-400/80">
                          Added to the customer&apos;s debt ledger.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border border-emerald-200/60 bg-emerald-50/60 p-2 text-xs text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3" /> Paid in full
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Payment terms, additional info..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/invoices">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            {submitting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
