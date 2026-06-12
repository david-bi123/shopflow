'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Title shown at the top of the card. Defaults to "Something went wrong". */
  title?: string
  /** Description below the title. */
  description?: string
  /** Where the "Back" / "Home" buttons link. Defaults to /dashboard. */
  homeHref?: string
  /** Whether to show the "Go back" link. */
  showBack?: boolean
  /** Compact mode (e.g. for inline errors in cards). */
  compact?: boolean
}

/**
 * Shared error fallback UI. Each `error.tsx` and `global-error.tsx`
 * just calls this with a slightly different message. We log the error
 * to the console so Vercel / Sentry (if wired up) picks it up, and we
 * also include the optional `digest` (a server-side request id) so
 * support can correlate the report.
 */
export function ErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. You can try again, or head back to the dashboard. If the problem keeps happening, please contact support.',
  homeHref = '/dashboard',
  showBack = true,
  compact = false,
}: ErrorFallbackProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', { message: error.message, digest: error.digest, stack: error.stack })
  }, [error])

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={reset} size="sm" variant="outline">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 ring-1 ring-destructive/30">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row">
          {showBack && (
            <Button asChild variant="ghost" size="sm">
              <Link href={homeHref}>
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Go home
              </Link>
            </Button>
          )}
          <Button onClick={reset} size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
