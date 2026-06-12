'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, X, Copy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Listens to window 'error' and 'unhandledrejection' events and surfaces
 * them in a sticky bottom-right panel. Mount once at the root of the
 * dashboard tree. Click "Copy" to put the stack on the clipboard, "Reload"
 * to retry the page, or the X to dismiss.
 *
 * Only renders in development. In production we keep it mounted but
 * hidden so it costs nothing.
 */
export function GlobalErrorCatcher() {
  const [error, setError] = useState<{
    title: string
    detail: string
    stack?: string
    source: 'window' | 'unhandledrejection' | 'action'
    at: string
  } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    setIsDev(process.env.NODE_ENV !== 'production')
  }, [])

  const onWindowError = useCallback((event: ErrorEvent) => {
    setError({
      title: event.message || 'Uncaught error',
      detail: `${event.filename ?? 'inline'}:${event.lineno ?? 0}:${event.colno ?? 0}`,
      stack: event.error?.stack,
      source: 'window',
      at: new Date().toISOString(),
    })
    setExpanded(true)
  }, [])

  const onUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason
    setError({
      title: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
      detail: reason instanceof Error ? reason.stack ?? '' : '',
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
      at: new Date().toISOString(),
    })
    setExpanded(true)
  }, [])

  useEffect(() => {
    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [onWindowError, onUnhandledRejection])

  if (!isDev || !error) return null

  async function copyStack() {
    const text = [
      error?.title,
      `at ${error?.at}`,
      error?.detail,
      error?.stack,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 max-w-lg rounded-xl border border-destructive/40 bg-card/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/30">
          <AlertTriangle className="size-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-destructive">Runtime error</p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={copyStack}
                aria-label="Copy stack"
                title="Copy stack"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => window.location.reload()}
                aria-label="Reload page"
                title="Reload page"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setError(null)}
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs font-medium text-foreground break-words">
            {error.title}
          </p>
          <p className="text-[11px] text-muted-foreground break-all">{error.detail}</p>
          {expanded && error.stack && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-zinc-950/95 p-2 text-[10px] leading-snug text-zinc-100">
              {error.stack}
            </pre>
          )}
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {error.source} \u00b7 {error.at}
          </p>
        </div>
      </div>
    </div>
  )
}
