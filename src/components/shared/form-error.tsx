'use client'

import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FormErrorProps {
  error?: string | null
  onDismiss?: () => void
  className?: string
}

/**
 * Render a server-action error message prominently at the top of a form.
 * Pass `onDismiss` to add a close button. Returns null when there's no
 * error so the parent doesn't need to conditionally render.
 */
export function FormError({ error, onDismiss, className }: FormErrorProps) {
  if (!error) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive ring-1 ring-destructive/20 dark:bg-destructive/10',
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 break-words font-medium">{error}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Dismiss error"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
