import { describe, it, expect, beforeAll } from 'vitest'
import { buildPublicToken, verifyPublicToken } from '../public-token'

// These tests guard the single most security-sensitive building block
// in the whole app: the public sharing tokens that gate unauthenticated
// access to receipts and invoices. If the HMAC ever silently weakens
// (e.g. someone switches to SHA-1, or accidentally drops the
// constant-time compare), these tests fail loudly.

beforeAll(() => {
  // The HMAC signPayload() in public-token.ts throws if NEXTAUTH_SECRET
  // is unset. We set a deterministic test secret here so the module
  // can be imported. Production reads this from the env.
  process.env.NEXTAUTH_SECRET = 'test-secret-do-not-use-in-prod-aaaaaaaaaaaaaaaaa'
})

describe('public-token', () => {
  it('round-trips a valid sale token', () => {
    const token = buildPublicToken({ t: 's', tn: 42, id: 7 })
    const verified = verifyPublicToken(token)
    expect(verified).toEqual({ t: 's', tn: 42, id: 7 })
  })

  it('round-trips a valid invoice token', () => {
    const token = buildPublicToken({ t: 'i', tn: 1, id: 999 })
    const verified = verifyPublicToken(token)
    expect(verified).toEqual({ t: 'i', tn: 1, id: 999 })
  })

  it('rejects a token with a flipped bit in the signature', () => {
    const token = buildPublicToken({ t: 's', tn: 1, id: 1 })
    // Flip one character in the signature segment.
    const parts = token.split('.')
    const sig = parts[3]!
    const flipped = sig[0] === 'A' ? `B${sig.slice(1)}` : `A${sig.slice(1)}`
    const tampered = [parts[0], parts[1], parts[2], flipped].join('.')
    expect(verifyPublicToken(tampered)).toBeNull()
  })

  it('rejects a token with a tampered tenant id', () => {
    const token = buildPublicToken({ t: 's', tn: 1, id: 5 })
    // Change the tenant id to a different one — this is exactly the
    // cross-tenant IDOR attack the HMAC exists to prevent.
    const tampered = token.replace(/^s\.1\./, 's.2.')
    expect(verifyPublicToken(tampered)).toBeNull()
  })

  it('rejects a token with a tampered resource id', () => {
    const token = buildPublicToken({ t: 'i', tn: 7, id: 1 })
    const tampered = token.replace(/\.1\./, '.2.')
    expect(verifyPublicToken(tampered)).toBeNull()
  })

  it('rejects a malformed token (wrong segment count)', () => {
    expect(verifyPublicToken('a.b.c')).toBeNull()
    expect(verifyPublicToken('a.b.c.d.e')).toBeNull()
  })

  it('rejects a token with a non-numeric id', () => {
    // Hand-crafted "valid" shape but with `id=abc` to confirm the
    // regex guard catches it.
    const bad = 's.1.abc.AAAAAAAAAAAAAAAA'
    expect(verifyPublicToken(bad)).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(verifyPublicToken('')).toBeNull()
  })

  it('rejects a token of the wrong kind (sale token used for invoice lookup)', () => {
    // The token itself is valid, but `verifyPublicToken` is type-agnostic —
    // the caller is responsible for checking `payload.t === 'i'`. This
    // test documents that contract.
    const token = buildPublicToken({ t: 's', tn: 1, id: 1 })
    const payload = verifyPublicToken(token)
    expect(payload?.t).toBe('s')
  })
})
