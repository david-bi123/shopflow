'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ArrowLeft, User, Package, CreditCard, Receipt, ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { createSaleSchema, type CreateSaleInput } from '@/lib/validations/sale'
import { createSale } from '@/lib/actions/sale-actions'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'

type FormValues = CreateSaleInput

const defaultItem = { name: '', quantity: 1, price: 0, subtotal: 0 }

export default function NewSalePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [currency, setCurrency] = useState('GHS')

  useEffect(() => {
    async function loadSettings() {
      try {
        const { getSettings } = await import('@/lib/actions/settings-actions')
        const result = await getSettings()
        if (!('error' in result)) {
          setCurrency((result.settings as { currency: string }).currency)
        }
      } catch {
        // use default
      }
    }
    loadSettings()
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(createSaleSchema) as never,
    defaultValues: {
      customerName: '',
      customerPhone: '',
      items: [{ ...defaultItem }],
      discount: 0,
      tax: 0,
      paymentMethod: 'cash',
      notes: '',
    },
  })

  const { register, control, handleSubmit, formState: { errors }, watch } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const discount = watch('discount') || 0
  const tax = watch('tax') || 0

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  )
  const grandTotal = subtotal - Number(discount) + Number(tax)

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    try {
      const calculatedSubtotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
        0
      )
      const calculatedTotal = calculatedSubtotal - Number(discount) + Number(tax)
      await createSale({
        ...data,
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
      })
      toast.success('Sale created successfully')
      router.push('/sales')
    } catch {
      toast.error('Failed to create sale')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Sale" description="Create a new sales transaction">
        <Button variant="outline" asChild>
          <Link href="/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to Sales
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
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone (optional)</Label>
              <Input
                id="customerPhone"
                {...register('customerPhone')}
                placeholder="Enter phone number"
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
                <CardTitle className="text-base">Items</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...defaultItem })}
              >
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
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.name?.message}
                        </p>
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.quantity`}>Qty *</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`)}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.price`}>Price *</Label>
                      <Input
                        id={`items.${index}.price`}
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`items.${index}.price`)}
                      />
                      {errors.items?.[index]?.price && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.price?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium">
                        {formatCurrency(lineTotal, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {errors.items?.root && (
              <p className="text-sm text-destructive">{errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                defaultValue="cash"
                onValueChange={(v) => form.setValue('paymentMethod', v as FormValues['paymentMethod'])}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('discount')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('tax')}
                />
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
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-destructive">-{formatCurrency(Number(discount), currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span className="text-emerald-600">+{formatCurrency(Number(tax), currency)}</span>
                </div>
                <div className="border-t border-primary/10 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrency(grandTotal, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/sales">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="min-w-[180px] bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
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
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Sale
              </>
            )}
          </Button>
        </div>
      </form>

    </div>
  )
}
