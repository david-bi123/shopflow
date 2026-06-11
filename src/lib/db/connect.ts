"use server"

import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema/index'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null
let pool: ReturnType<typeof mysql.createPool> | null = null

const isProd = process.env.NODE_ENV === 'production'

function getPoolConfig() {
  const host = process.env.TIDB_HOST || '127.0.0.1'
  const isLocal = host === '127.0.0.1' || host === 'localhost'

  return {
    host,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER || 'root',
    password: process.env.TIDB_PASSWORD || '',
    database: process.env.TIDB_DATABASE || 'indflow',
    connectionLimit: 10,
    queueLimit: 0,
    // Serverless connections need a finite connect timeout so a dead pool
    // doesn't hang requests for 30+ seconds.
    connectTimeout: 10_000,
    waitForConnections: true,
    // TiDB Cloud requires SSL for any non-allowlisted connection; turn it on
    // whenever we're not running a local dev DB.
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' as const } }),
  }
}

async function dbConnect(): Promise<ReturnType<typeof drizzle<typeof schema>>> {
  if (!db) {
    if (!process.env.TIDB_HOST) {
      // Surface a clear error in the logs instead of silently falling back
      // to localhost in production.
      if (isProd) {
        throw new Error(
          'TIDB_HOST is not set. Set TiDB connection env vars in your deployment platform.',
        )
      }
      console.warn('⚠️  TIDB_HOST not set — falling back to 127.0.0.1 for local development.')
    }

    pool = mysql.createPool(getPoolConfig())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db = drizzle(pool as any, { schema, mode: 'default' })

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Connected to TiDB')
    }
  }

  return db!
}

/**
 * Lightweight liveness probe used by /api/health. Returns true if the
 * underlying MySQL pool can hand us a connection and answer SELECT 1.
 */
export async function pingDb(): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  try {
    if (!pool) {
      await dbConnect()
    }
    const conn = await pool!.getConnection()
    const t0 = Date.now()
    await conn.query('SELECT 1')
    const latencyMs = Date.now() - t0
    conn.release()
    return { ok: true, latencyMs }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export { dbConnect }
