import { actionErr, type ActionResult } from '@/lib/utils/action-result'

/**
 * Wrap an async server action body so that:
 *   - Any thrown error is caught and turned into `{ error: ... }`.
 *   - The error is logged to the server console (Vercel logs) with a
 *     stack trace, so it never disappears silently.
 *   - Zod validation errors get a friendly per-field message.
 *
 * Usage:
 *
 *   export async function createInvoice(data: CreateInvoiceInput): Promise<ActionResult<Invoice>> {
 *     return actionHandler('createInvoice', { data }, async () => {
 *       const session = await auth()
 *       ...
 *       return { success: true, data: invoice }
 *     })
 *   }
 */
export async function actionHandler<T>(
  name: string,
  context: Record<string, unknown>,
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
     
    console.error(`[${name}] failed`, {
      ...context,
      error: message,
      stack,
    })
    // Zod issues: prefer a field-level message
    if (err instanceof Error && err.name === 'ZodError') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issues = (err as any).issues as Array<{ path?: Array<string | number>; message: string }> | undefined
      if (issues && issues.length > 0) {
        const first = issues[0]
        const path = (first.path ?? []).join('.')
        return actionErr(path ? `${path}: ${first.message}` : first.message)
      }
    }
    return actionErr(message || 'An unexpected error occurred')
  }
}
