import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Public sharing tokens for receipts and invoices.
 *
 * Public receipt / invoice URLs must NOT be guessable. The previous design
 * used the human-readable sale/invoice number (e.g. `SALE-00001`) which is
 * trivially enumerable: a malicious actor could walk `/r/SALE-00001`,
 * `/r/SALE-00002`, … and scrape every tenant's transactions.
 *
 * Tokens are self-describing: `<payload>.<signature>`, where the payload
 * encodes the resource type + tenant id + numeric id, and the signature is
 * an HMAC-SHA256 of the payload using the server's NEXTAUTH_SECRET.
 *
 * The id is in the payload so lookups are O(1); the HMAC is required so
 * the id can't be tampered with. Constant-time comparison is used to
 * prevent timing side channels.
 *
 * Tokens do NOT expire on their own — the assumption is that the resource
 * key + secret is enough to keep them unguessable. If you ever need to
 * revoke a share, delete the underlying sale/invoice row.
 */

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) {
    throw new Error(
      'NEXTAUTH_SECRET is not set — public tokens cannot be generated. ' +
        'Set it in your environment (the same secret used for NextAuth).',
    )
  }
  return s
}

const SIG_BYTES = 32 // 256 bits

function signPayload(payload: string): string {
  return createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url')
    .slice(0, Math.ceil((SIG_BYTES * 4) / 3)) // base64url of N bytes is ⌈4N/3⌉ chars
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export type PublicTokenKind = 's' | 'i' // sale | invoice

export interface PublicTokenPayload {
  /** Resource type discriminator. */
  t: PublicTokenKind
  /** Tenant id, so a token for sale #5 in tenant A cannot match sale #5 in tenant B. */
  tn: number
  /** Numeric id of the resource. */
  id: number
}

export function buildPublicToken(payload: PublicTokenPayload): string {
  const body = `${payload.t}.${payload.tn}.${payload.id}`
  const sig = signPayload(body)
  return `${body}.${sig}`
}

/**
 * Verify a token and return the decoded payload, or `null` if invalid.
 *
 * The token format is `<t>.<tn>.<id>.<sig>`. Any malformed input returns
 * `null` and is safe to pass user-supplied data to.
 */
export function verifyPublicToken(token: string): PublicTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [t, tnStr, idStr, sig] = parts
  if (t !== 's' && t !== 'i') return null
  if (!/^\d+$/.test(tnStr) || !/^\d+$/.test(idStr)) return null
  const tn = Number(tnStr)
  const id = Number(idStr)
  if (!Number.isSafeInteger(tn) || !Number.isSafeInteger(id)) return null
  if (tn <= 0 || id <= 0) return null

  const body = `${t}.${tn}.${id}`
  const expected = signPayload(body)
  if (!constantTimeEqual(sig, expected)) return null

  return { t, tn, id }
}
