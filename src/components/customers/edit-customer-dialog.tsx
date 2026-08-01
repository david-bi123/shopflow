'use client'

import { useEffect, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateCustomer } from '@/lib/actions/customer-actions'

export interface EditableCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

interface EditCustomerDialogProps {
  customer: EditableCustomer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditCustomerDialog({ customer, open, onOpenChange, onSaved }: EditCustomerDialogProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  // Re-seed the form each time the dialog opens for a customer.
  useEffect(() => {
    if (open && customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id])

  async function handleSave() {
    if (!customer) return
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const res = await updateCustomer(customer.id, {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      })
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Customer updated')
      onOpenChange(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Changing the name updates it on this customer&apos;s saved record and on all of their
            sales, receipts, and invoices automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-customer-name">Name *</Label>
            <Input
              id="edit-customer-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer full name"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-customer-phone">Phone</Label>
              <Input
                id="edit-customer-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+233 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer-email">Email</Label>
              <Input
                id="edit-customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-address">Address</Label>
            <Textarea
              id="edit-customer-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-notes">Notes</Label>
            <Textarea
              id="edit-customer-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 size-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
