'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Dashboard segment error boundary. Sits inside the auth'd layout so
 * the chrome (sidebar, header) is preserved on the error page.
 */
export default function DashboardError({
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
      title="We hit a snag loading this page"
      description="Something broke while loading the dashboard. The error has been logged — try again, or head back to the home page."
      homeHref="/dashboard"
    />
  )
}
