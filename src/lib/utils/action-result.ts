/**
 * Standard result type for every server action in the app. Use this so
 * every form can check the same way:
 *
 *   const result = await createSale(data)
 *   if (result.error) { toast.error(result.error); return }
 *   if (result.success) { ... }
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T; error?: undefined }
  | { success?: false; error: string; data?: undefined }

export function actionOk<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function actionErr(message: string): ActionResult<never> {
  return { error: message }
}

/**
 * Run a server action and surface a `toast.error(...)` if the result is
 * an error. Returns the data on success or `null` on failure. Use this
 * inside form onSubmit handlers:
 *
 *   const created = await withToastErrors(createSale(data), toast)
 *   if (!created) return
 *   router.push(`/sales/${created.id}`)
 */
export async function withToastErrors<T>(
  promise: Promise<ActionResult<T>>,
  toast: {
    error: (message: string) => void
    success?: (message: string) => void
  },
  options?: { successMessage?: string }
): Promise<T | null> {
  try {
    const result = await promise
    if (result?.error) {
      toast.error(result.error)
      return null
    }
    if (result && 'data' in result && options?.successMessage) {
      toast.success?.(options.successMessage)
    }
    return (result as { data: T }).data
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message || 'Something went wrong. Please try again.'
        : 'Something went wrong. Please try again.'
    toast.error(message)
    return null
  }
}
