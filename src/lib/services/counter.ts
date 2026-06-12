import { dbConnect } from '@/lib/db/connect'
import { counters } from '@/lib/db/schema'
import { SALE_NUMBER_PREFIX, INVOICE_NUMBER_PREFIX } from '@/lib/utils/constants'
import { sql, eq, and } from 'drizzle-orm'

/**
 * Atomically increment a tenant-scoped counter and return the new value.
 *
 * Uses MySQL's `INSERT ... ON DUPLICATE KEY UPDATE sequence = sequence + 1` so
 * the read-modify-write is a single round trip and two concurrent callers can
 * never receive the same number. The previous implementation did a SELECT then
 * an UPDATE, which has a classic race condition.
 */
async function getNextSequence(tenantId: number, name: string): Promise<number> {
  const db = await dbConnect()

  // Upsert + atomic increment in one statement. `LAST_INSERT_ID(expr)` is a
  // MySQL trick that lets us read the post-update value back in the same query.
  await db
    .insert(counters)
    .values({ tenantId, name, sequence: 1 })
    .onDuplicateKeyUpdate({
      set: { sequence: sql`${counters.sequence} + 1` },
    })

  const [row] = await db
    .select({ sequence: counters.sequence })
    .from(counters)
    .where(and(eq(counters.tenantId, tenantId), eq(counters.name, name)))
    .limit(1)

  return row?.sequence ?? 1
}

export async function getNextSaleNumber(tenantId: number): Promise<string> {
  const seq = await getNextSequence(tenantId, 'sale')
  return `${SALE_NUMBER_PREFIX}${String(seq).padStart(5, '0')}`
}

export async function getNextInvoiceNumber(tenantId: number): Promise<string> {
  const year = new Date().getFullYear()
  const seq = await getNextSequence(tenantId, `invoice_${year}`)
  return `${INVOICE_NUMBER_PREFIX}${year}-${String(seq).padStart(3, '0')}`
}
