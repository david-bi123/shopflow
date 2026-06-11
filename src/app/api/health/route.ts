import { NextResponse } from 'next/server'
import { pingDb } from '@/lib/db/connect'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Public liveness/readiness endpoint. No auth, no IP restriction, no rate
 * limit — anyone can hit it. Returns:
 *
 * {
 *   status: 'ok' | 'degraded',
 *   timestamp: ISO string,
 *   env: { nodeEnv, appUrlSet, dbHostSet },
 *   checks: { database: { ok, latencyMs?, error? } }
 * }
 *
 * HTTP status: 200 when ok, 503 when degraded.
 */
export async function GET() {
  const db = await pingDb()
  const allOk = db.ok

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
        appUrlSet: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
        dbHostSet: Boolean(process.env.TIDB_HOST),
      },
      checks: {
        database: db,
      },
    },
    { status: allOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
