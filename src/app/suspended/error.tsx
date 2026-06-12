'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Error boundary for the suspended screen. Lands the user on /login
 * so they can switch accounts or contact support.
 */
export default function SuspendedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Something went wrong"
      description="An error occurred loading this page. Please try again or contact support."
      homeHref="/login"
    />
  )
}
