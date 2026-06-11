"use server"

import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema/index'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

async function dbConnect(): Promise<ReturnType<typeof drizzle<typeof schema>>> {
  if (!db) {
    const isLocal = !process.env.TIDB_HOST || process.env.TIDB_HOST === '127.0.0.1' || process.env.TIDB_HOST === 'localhost'
    const pool = mysql.createPool({
      host: process.env.TIDB_HOST || '127.0.0.1',
      port: parseInt(process.env.TIDB_PORT || '4000'),
      user: process.env.TIDB_USER || 'root',
      password: process.env.TIDB_PASSWORD || '',
      database: process.env.TIDB_DATABASE || 'indflow',
      connectionLimit: 10,
      queueLimit: 0,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: true } }),
    })

    db = drizzle(pool as unknown as mysql.Pool, { schema, mode: 'default' })

    console.log('✅ Connected to TiDB')
  }

  return db!
}

export { dbConnect }
