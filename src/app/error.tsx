'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Root-level error boundary. Catches anything that escapes the more
 * specific route segments (auth, dashboard, admin, public).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback error={error} reset={reset} homeHref="/dashboard" />
}
