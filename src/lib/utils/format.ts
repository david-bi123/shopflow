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
  let d: Date
  if (typeof date === 'string') {
    // A date-only string like "2026-08-01" parses as UTC midnight, which
    // shifts a day for timezones west of UTC. Re-parse as local midnight
    // so the displayed calendar day is always the stored one.
    d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date)
  } else {
    d = date
  }
  if (Number.isNaN(d.getTime())) return String(date ?? '')
  // Day-first ordering, e.g. "12 April, 2026" (not "April 12, 2026").
  const month = d.toLocaleString('en-US', { month: format === 'long' ? 'long' : 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const base = `${day} ${month}, ${year}`
  if (format === 'datetime') {
    const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${base}, ${time}`
  }
  return base
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

const WORDS_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
]
const WORDS_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (hundreds > 0) {
    parts.push(`${WORDS_ONES[hundreds]} Hundred${rest > 0 ? ' and' : ''}`)
  }
  if (rest > 0) {
    if (rest < 20) parts.push(WORDS_ONES[rest])
    else {
      const tens = Math.floor(rest / 10)
      const ones = rest % 10
      parts.push(WORDS_TENS[tens] + (ones > 0 ? `-${WORDS_ONES[ones]}` : ''))
    }
  }
  return parts.join(' ')
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero'
  const groups: Array<{ value: number; label: string }> = [
    { value: 1000000000, label: 'Billion' },
    { value: 1000000, label: 'Million' },
    { value: 1000, label: 'Thousand' },
    { value: 1, label: '' },
  ]
  const parts: string[] = []
  for (const { value, label } of groups) {
    if (n >= value) {
      const q = Math.floor(n / value)
      parts.push(`${threeDigitsToWords(q)}${label ? ` ${label}` : ''}`)
      n -= q * value
    }
  }
  return parts.join(' ')
}

const CURRENCY_UNITS: Record<string, { whole: string; part: string }> = {
  GHS: { whole: 'Ghana Cedis', part: 'Pesewas' },
  NGN: { whole: 'Naira', part: 'Kobo' },
  KES: { whole: 'Kenyan Shillings', part: 'Cents' },
  USD: { whole: 'US Dollars', part: 'Cents' },
  GBP: { whole: 'Pounds Sterling', part: 'Pence' },
  EUR: { whole: 'Euros', part: 'Cents' },
}

/**
 * Renders a monetary amount in words, invoice-book style, e.g.
 * 250.5 GHS → "Two Hundred and Fifty Ghana Cedis and Fifty Pesewas only".
 */
export function formatAmountInWords(amount: number, currency = DEFAULT_CURRENCY): string {
  const isNegative = amount < 0
  const abs = Math.abs(Math.round(amount * 100) / 100)
  const whole = Math.floor(abs)
  const cents = Math.round((abs - whole) * 100)
  const { whole: wholeUnit, part: partUnit } =
    CURRENCY_UNITS[currency] ?? { whole: 'Currency', part: 'Cents' }
  const parts: string[] = []
  if (whole > 0) parts.push(`${numberToWords(whole)} ${wholeUnit}`)
  if (cents > 0) parts.push(`${numberToWords(cents)} ${partUnit}`)
  const text = parts.length > 0 ? parts.join(' and ') : 'Zero'
  return `${isNegative ? 'Minus ' : ''}${text} only`
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
