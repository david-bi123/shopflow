'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { createInvoiceSchema, type CreateInvoiceInput } from '@/lib/validations/invoice'
import { createInvoice } from '@/lib/actions/invoice-actions'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import Link from 'next/link'

type FormValues = CreateInvoiceInput

const defaultItem = { name: '', description: '', quantity: 1, price: 0, total: 0 }

export default function NewInvoicePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(createInvoiceSchema) as any,
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ ...defaultItem }],
      dueDate: '',
      discount: 0,
      tax: 0,
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
      await createInvoice(data)
      toast.success('Invoice created successfully')
      router.push('/invoices')
    } catch {
      toast.error('Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create a new invoice for your customer">
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <ArrowLeft className="mr-2 size-4" />
            Back to Invoices
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {errors.customerEmail && (
                  <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...defaultItem })}
            >
              <Plus className="mr-2 size-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const qty = Number(items[index]?.quantity) || 0
              const price = Number(items[index]?.price) || 0
              const lineTotal = qty * price

              return (
                <div key={field.id} className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
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
                        variant="ghost"
                        size="icon"
                        className="mt-6 shrink-0 text-destructive"
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
                  <div className="grid grid-cols-3 gap-4">
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
                      <Label>Total</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                        {formatCurrency(lineTotal)}
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

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(Number(discount))}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax</span>
                <span>+{formatCurrency(Number(tax))}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/invoices">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
