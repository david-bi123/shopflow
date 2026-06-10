import { dbConnect } from '@/lib/db/connect'
import { counters } from '@/lib/db/schema'
import { SALE_NUMBER_PREFIX, INVOICE_NUMBER_PREFIX } from '@/lib/utils/constants'
import { eq, and } from 'drizzle-orm'

async function getNextSequence(tenantId: number, name: string): Promise<number> {
  const db = await dbConnect()

  const [existing] = await db.select().from(counters)
    .where(and(eq(counters.tenantId, tenantId), eq(counters.name, name)))
    .limit(1)

  if (existing) {
    const nextSeq = existing.sequence + 1
    await db.update(counters).set({ sequence: nextSeq })
      .where(and(eq(counters.tenantId, tenantId), eq(counters.name, name)))
    return nextSeq
  }

  await db.insert(counters).values({ tenantId, name, sequence: 1 })
  return 1
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
