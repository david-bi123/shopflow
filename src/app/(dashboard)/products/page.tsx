'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Package,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format'

interface Product {
  id: string
  name: string
  sku: string | null
  category: string | null
  price: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  status: string
  imageUrl: string | null
  createdAt: string
}

const PAGE_SIZE = 10

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  })
  const [deleting, setDeleting] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { getProducts } = await import('@/lib/actions/product-actions')
      const result = await getProducts({
        search: search || undefined,
        category: category || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setProducts(result.data as unknown as Product[])
      setTotalPages(result.pages)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [search, category, status, page])

  const fetchCategories = useCallback(async () => {
    try {
      const { getProductCategories } = await import('@/lib/actions/product-actions')
      const cats = await getProductCategories()
      setCategories(cats)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function getStockBadge(item: Product) {
    if (item.stockQuantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    if (item.stockQuantity <= item.lowStockThreshold) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low Stock</Badge>
    }
    return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">In Stock</Badge>
  }

  async function handleDelete() {
    const product = deleteDialog.product
    if (!product) return
    setDeleting(true)
    try {
      const { deleteProduct } = await import('@/lib/actions/product-actions')
      const result = await deleteProduct(Number(product.id))
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Product deleted')
      setDeleteDialog({ open: false, product: null })
      fetchProducts()
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && products.length === 0) {
    return (
      <LoadingSkeleton rows={5} columns={6} />
    )
  }

  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={() => fetchProducts()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your product inventory">
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="w-40">
          <Select
            value={category}
            onValueChange={(val) => {
              setCategory(val)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={search || category || status ? 'Try a different search term' : 'Add your first product to get started'}
          action={!search && !category && !status ? {
            label: 'Add Product',
            href: '/dashboard/products/new',
          } : undefined}
        />
      ) : (
        <>
          <div className="rounded-xl border bg-card/50 shadow-sm backdrop-blur">
            <Table>
              <TableHeader className="[&_tr]:border-b">
                <TableRow>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">Category</TableHead>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">Price</TableHead>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">Stock</TableHead>
                  <TableHead className="text-xs font-medium tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="w-20 text-xs font-medium tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                  >
                    <TableCell className="text-sm font-mono">{product.sku ?? '—'}</TableCell>
                    <TableCell className="text-sm font-medium">{product.name}</TableCell>
                    <TableCell className="text-sm">{product.category ?? '—'}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-sm">{getStockBadge(product)}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={product.status === 'active' ? 'secondary' : 'outline'} className={
                        product.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                          : ''
                      }>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/products/${product.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteDialog({ open: true, product })
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, product: open ? deleteDialog.product : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.product?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, product: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
