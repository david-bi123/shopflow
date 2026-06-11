import { dbConnect } from '@/lib/db/connect'
import { settings as settingsTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const DEFAULT_CURRENCY = 'GHS'

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'datetime' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const options: Intl.DateTimeFormatOptions = {
    ...(format === 'short' && { month: 'short', day: 'numeric', year: 'numeric' }),
    ...(format === 'long' && { month: 'long', day: 'numeric', year: 'numeric' }),
    ...(format === 'datetime' && { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }
  return new Intl.DateTimeFormat('en-US', options).format(d)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Resolve a tenant's stored currency. Falls back to GHS so that brand-new
 * tenants (or ones whose settings row was never created) always render
 * prices in Ghana Cedis by default.
 */
export async function getCurrencyForTenant(tenantId: number | string): Promise<string> {
  try {
    const db = await dbConnect()
    const [row] = await db
      .select({ currency: settingsTable.currency })
      .from(settingsTable)
      .where(eq(settingsTable.tenantId, Number(tenantId)))
      .limit(1)
    return row?.currency || DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}
