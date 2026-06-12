'use client'

import { AlertCircle, X, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

export interface FormFieldError {
  field: string
  message: string
}

interface FormErrorSummaryProps {
  /** Validation errors from react-hook-form or our server action. */
  errors: FormFieldError[]
  /** Server-side error message (separate from per-field validation). */
  serverError?: string | null
  /** Optional dismiss callback. Renders an X button when provided. */
  onDismiss?: () => void
  className?: string
}

/**
 * Always-visible top-of-form banner that aggregates every error so a
 * problem can't be missed. The red card scrolls into view on mount and
 * shows a collapsible list of every field error + the server error.
 */
export function FormErrorSummary({
  errors,
  serverError,
  onDismiss,
  className,
}: FormErrorSummaryProps) {
  const [expanded, setExpanded] = useState(true)
  const total = errors.length + (serverError ? 1 : 0)
  if (total === 0) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive ring-1 ring-destructive/20 dark:bg-destructive/10',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {total === 1
                ? 'There is 1 problem that prevents this from being saved'
                : `There are ${total} problems that prevent this from being saved`}
            </p>
            <div className="flex items-center gap-1">
              {errors.length > 1 && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                >
                  {expanded ? 'Hide' : 'Show all'}
                  {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md p-1 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Dismiss"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {serverError && (
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0" />
                  <span className="break-words">
                    <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">Server</span>
                    {' '}
                    {serverError}
                  </span>
                </li>
              )}
              {errors.map((err, idx) => (
                <li key={`${err.field}-${idx}`} className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0" />
                  <span className="break-words">
                    <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">
                      {err.field}
                    </span>
                    {' '}
                    {err.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Recursively flatten react-hook-form's nested errors object into a flat
 * list of { field, message } entries for the summary above.
 */
export function flattenErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Record<string, any> | undefined,
  prefix = ''
): FormFieldError[] {
  if (!errors) return []
  const out: FormFieldError[] = []
  for (const [k, v] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (!v) continue
    if (typeof v === 'object' && 'message' in v && typeof v.message === 'string') {
      out.push({ field: path, message: v.message as string })
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenErrors(v, path))
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') {
          if ('message' in item && typeof item.message === 'string') {
            out.push({ field: `${path}[${i}]`, message: item.message as string })
          } else {
            out.push(...flattenErrors(item, `${path}[${i}]`))
          }
        }
      })
    }
  }
  return out
}
