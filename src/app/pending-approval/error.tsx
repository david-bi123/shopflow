'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Error boundary for unauthenticated areas (pending-approval, suspended).
 */
export default function PublicError({
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
      description="An error occurred loading this page. Please try again."
      homeHref="/login"
    />
  )
}
