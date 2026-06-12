'use client'

import { useEffect, useState } from 'react'
import { HandCoins, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { recordSalePayment } from '@/lib/actions/debt-actions'
import { formatCurrency } from '@/lib/utils/format'

type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string
  saleNumber: string
  customerName: string
  balanceDue: number
  currency?: string
  onSuccess?: () => void
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  saleId,
  saleNumber,
  customerName,
  balanceDue,
  currency = 'GHS',
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill amount with the full balance due whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '')
      setPaymentMethod('cash')
      setNotes('')
      setError(null)
    }
  }, [open, balanceDue])

  const numericAmount = Number(amount)
  const isOverpayment = numericAmount > balanceDue + 0.001
  const isInvalid = !numericAmount || numericAmount <= 0 || isOverpayment

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isInvalid) {
      setError(
        isOverpayment
          ? `Amount cannot exceed the outstanding balance of ${formatCurrency(balanceDue, currency)}`
          : 'Enter a valid amount'
      )
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await recordSalePayment(saleId, {
        amount: numericAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      })
      if ('error' in result && result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(`Payment of ${formatCurrency(numericAmount, currency)} recorded`)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const payFull = () => {
    if (balanceDue > 0) setAmount(balanceDue.toFixed(2))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
            <HandCoins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment toward <span className="font-medium text-foreground">#{saleNumber}</span>
            {customerName ? <> for <span className="font-medium text-foreground">{customerName}</span></> : null}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50/70 p-3 ring-1 ring-inset ring-border/60 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold tabular-nums text-red-700 dark:text-red-400">
                {formatCurrency(balanceDue, currency)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount *</Label>
              <button
                type="button"
                className="text-[10px] font-semibold uppercase tracking-wider text-primary underline-offset-2 hover:underline"
                onClick={payFull}
                disabled={balanceDue <= 0}
              >
                Pay in full
              </button>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                min="0.01"
                max={balanceDue}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pr-12 tabular-nums"
                autoFocus
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                {currency}
              </span>
            </div>
            {isOverpayment && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3" />
                Amount cannot exceed {formatCurrency(balanceDue, currency)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Momo ref, partial deposit, etc."
              rows={2}
              maxLength={500}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isInvalid || submitting}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
            >
              {submitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
