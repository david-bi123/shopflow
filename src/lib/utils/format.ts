import { randomBytes } from 'crypto'

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

/**
 * Cryptographically-secure random password.
 *
 * Uses `crypto.randomBytes` (NOT `Math.random`) so the output is
 * unpredictable — important because the password is shown to the
 * inviter in plain text and used as the initial credential for a new
 * staff member. Guarantees at least one character from each pool so
 * the result always meets typical password-strength requirements.
 */
export function generatePassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O
  const lower = 'abcdefghjkmnpqrstuvwxyz' // no l
  const digits = '23456789' // no 0/1
  const symbols = '!@#$%^&*?'
  const all = upper + lower + digits + symbols

  if (length < 4) {
    throw new Error('generatePassword: length must be >= 4 to include every pool')
  }

  // Pick one from each required pool first, then fill the rest from
  // the combined alphabet.
  const required = [
    upper[randomBytes(1)[0] % upper.length],
    lower[randomBytes(1)[0] % lower.length],
    digits[randomBytes(1)[0] % digits.length],
    symbols[randomBytes(1)[0] % symbols.length],
  ]

  const remaining = length - required.length
  const filler = new Array(remaining)
    .fill(0)
    .map(() => all[randomBytes(1)[0] % all.length])

  // Shuffle so the four required chars aren't always at the front.
  const combined = [...required, ...filler]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1)
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined.join('')
}
