'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
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
import { Card, CardContent } from '@/components/ui/card'

const UNITS = ['pcs', 'kg', 'liter', 'box', 'pair', 'meter']

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    costPrice: '',
    stockQuantity: '',
    lowStockThreshold: '10',
    category: '',
    unit: 'pcs',
    barcode: '',
    status: 'active',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      setErrors({ name: 'Product name is required' })
      return
    }

    setLoading(true)
    try {
      const { createProduct } = await import('@/lib/actions/product-actions')
      const result = await createProduct({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        price: form.price || '0',
        costPrice: form.costPrice || '0',
        stockQuantity: form.stockQuantity || '0',
        lowStockThreshold: form.lowStockThreshold || '10',
        category: form.category.trim() || undefined,
        unit: form.unit,
        barcode: form.barcode.trim() || undefined,
        status: form.status as 'active' | 'inactive',
      })

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Product created successfully')
      router.push('/dashboard/products')
    } catch {
      toast.error('Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Product" description="Create a new product in your inventory">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Product name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setField('sku', e.target.value)}
                  placeholder="SKU-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setField('barcode', e.target.value)}
                  placeholder="Barcode"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setField('costPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => setField('stockQuantity', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setField('lowStockThreshold', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  placeholder="e.g. Electronics"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={form.unit} onValueChange={(val) => setField('unit', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="status" className="cursor-pointer">Active</Label>
              <Switch
                id="status"
                checked={form.status === 'active'}
                onCheckedChange={(checked) => setField('status', checked ? 'active' : 'inactive')}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Product
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/products')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
