'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/** Admin (super-admin) segment error boundary. */
export default function AdminError({
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
      title="Admin console error"
      description="An error occurred in the admin console. The error has been logged. Try again, or head back to the dashboard."
      homeHref="/admin"
    />
  )
}
