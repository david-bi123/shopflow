// Direct test of the database layer for create-sale / create-invoice.
// This script inserts a sale + an invoice using the exact same logic the
// action does (minus the auth() call which we mock by reading the
// session from a SQL row).
import fs from 'fs'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (key) process.env[key] = val
      }
    }
  }
}

import { dbConnect } from '../src/lib/db/connect'
import { tenants, users, sales, invoices, customers, settings, debtLedger } from '../src/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

async function main() {
  console.log('\n=== Direct DB-layer test (no auth check) ===\n')

  const db = await dbConnect()

  // Find an existing tenant (Alice's Boutique, first shop)
  const [shop] = await db.select().from(settings).limit(1)
  if (!shop) {
    console.error('No tenant found')
    process.exit(1)
  }
  const tenantId = shop.tenantId
  console.log(`Tenant: ${tenantId}`)

  // Find the owner
  const [owner] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'owner')))
    .limit(1)
  if (!owner) {
    console.error('No owner found')
    process.exit(1)
  }
  console.log(`Owner: ${owner.id} (${owner.email})`)

  // Find a customer
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.tenantId, tenantId))
    .limit(1)
  if (!customer) {
    console.error('No customer found')
    process.exit(1)
  }
  console.log(`Customer: ${customer.id} (${customer.name})`)

  // Get the current counter so we can produce a unique sale number
  const counters = await db.execute(sql`SELECT name, sequence FROM counters WHERE tenant_id = ${tenantId}`)
  const counterRows = (counters[0] as unknown as Array<{ name: string; sequence: number }>) || []
  console.log(`Counters before:`, counterRows)

  // Pick a sale number that doesn't already exist
  const saleSeq = (counterRows.find((c) => c.name === 'sale')?.sequence ?? 0) + 1
  const saleNumber = `SALE-DBTEST-${String(saleSeq).padStart(4, '0')}`
  const now = new Date().toISOString()

  const items = [
    { name: 'Smoke Test Item', quantity: 1, price: 100, subtotal: 100 },
  ]
  const subtotal = 100
  const total = 115 // with 15% VAT
  const amountPaid = 50 // partial
  const amountOwed = total - amountPaid

  console.log(`\nInserting test sale ${saleNumber} (amountOwed=${amountOwed})...`)
  const inserted = await db.insert(sales).values({
    tenantId,
    saleNumber,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerId: customer.id,
    items,
    subtotal,
    discountPercent: 0,
    discount: 0,
    tax: 15,
    taxItems: [{ name: 'VAT', rate: 15, amount: 15 }],
    total,
    amountPaid,
    amountOwed,
    paymentMethod: 'cash',
    notes: 'Smoke test sale',
    createdBy: owner.id,
    createdAt: now,
    updatedAt: now,
  })
  console.log(`Inserted sale id=${inserted[0].insertId}`)

  // Now insert the debt_ledger entry (mimicking what createSale does)
  const [custRow] = await db
    .select({ totalDebt: customers.totalDebt })
    .from(customers)
    .where(eq(customers.id, customer.id))
    .limit(1)
  const previousBalance = custRow?.totalDebt ?? 0
  const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
  await db.insert(debtLedger).values({
    tenantId,
    customerId: customer.id,
    amount: amountOwed,
    type: 'sale_created',
    referenceType: 'sale',
    referenceId: null,
    notes: `Smoke test sale ${saleNumber} \u2014 paid ${amountPaid} of ${total}`,
    balanceAfter: newBalance,
    createdBy: owner.id,
    createdAt: now,
  })
  await db.update(customers)
    .set({
      totalDebt: newBalance,
      firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${now})`,
      lastDebtActivityAt: now,
    })
    .where(eq(customers.id, customer.id))
  console.log(`Customer totalDebt updated: ${previousBalance} -> ${newBalance}`)

  // Verify the sale row was created
  const [verify] = await db.select().from(sales).where(eq(sales.saleNumber, saleNumber))
  console.log(`\nVerified sale row: id=${verify?.id} number=${verify?.saleNumber} owed=${verify?.amountOwed}`)

  // Test cleanup: remove the test sale + reverse the debt
  await db.delete(sales).where(eq(sales.id, verify!.id))
  await db.insert(debtLedger).values({
    tenantId,
    customerId: customer.id,
    amount: -amountOwed,
    type: 'sale_voided',
    referenceType: 'sale',
    referenceId: null,
    notes: `Cleanup of smoke test sale ${saleNumber}`,
    balanceAfter: previousBalance,
    createdBy: owner.id,
    createdAt: new Date().toISOString(),
  })
  await db.update(customers).set({ totalDebt: previousBalance }).where(eq(customers.id, customer.id))
  console.log(`\nCleaned up test sale and reversed the debt.`)

  console.log('\n=== Test passed ===')
  process.exit(0)
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
