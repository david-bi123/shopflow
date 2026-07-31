export const APP_NAME = 'IndFlow'
export const SHOPFLOW_DESCRIPTION = 'Modern business management platform for retail shops and SMEs'

/**
 * Super admin contact (Ghana). Used on /pending-approval and /suspended pages
 * so users can reach the admin on WhatsApp to get their shop activated or
 * reinstated.
 */
export const SUPER_ADMIN_WHATSAPP = '233550624203' // 0550624203 in E.164
export const SUPER_ADMIN_WHATSAPP_DISPLAY = '+233 55 062 4203'
export const superAdminWhatsappLink = (message: string) =>
  `https://wa.me/${SUPER_ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`

export const PAGINATION_LIMIT = 20
export const PAGINATION_MAX_LIMIT = 100

export const SALE_NUMBER_PREFIX = 'SALE-'

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
] as const

/**
 * Resolve the display symbol for an ISO-4217 currency code. Falls back
 * to the code itself if the currency is unknown (e.g. a tenant
 * pre-configured a code we haven't catalogued yet).
 */
export function getCurrencySymbol(code: string | null | undefined): string {
  if (!code) return 'GHS'
  const match = CURRENCIES.find((c) => c.code === code)
  return match?.symbol ?? code
}

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Accra',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
] as const

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const
