'use server'

import { dbConnect } from '@/lib/db/connect'
import { sales, invoices } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { toNum } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'
import { buildPublicToken } from '@/lib/services/public-token'

/**
 * Generate a signed, unguessable public token for a sale.
 *
 * The returned token replaces the sale number in the public receipt URL.
 * Anyone with the token can read the receipt — but the token is a 256-bit
 * HMAC over `sale:<id>`, so the only way to obtain one is to be given the
 * share link by the shop or a customer.
 */
export async function getSalePublicToken(saleId: string): Promise<string | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const db = await dbConnect()
  const id = toNum(saleId)
  const tenantId = toNum(session.user.tenantId!)

  const [row] = await db
    .select({ id: sales.id })
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.tenantId, tenantId)))
    .limit(1)
  if (!row) return { error: 'Sale not found' }

  return buildPublicToken({ t: 's', tn: tenantId, id: row.id })
}

export async function getInvoicePublicToken(invoiceId: string): Promise<string | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const db = await dbConnect()
  const id = toNum(invoiceId)
  const tenantId = toNum(session.user.tenantId!)

  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .limit(1)
  if (!row) return { error: 'Invoice not found' }

  return buildPublicToken({ t: 'i', tn: tenantId, id: row.id })
}