'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Auth segment error boundary (login, register, forgot-password).
 * Lands the user on the login page so they can retry.
 */
export default function AuthError({
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
      title="We couldn't complete that action"
      description="The authentication flow hit an unexpected error. Please try again, or go back to the login page."
      homeHref="/login"
    />
  )
}
