// Quick verify: customers with their debt balances and ledger summary
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
import { sql } from 'drizzle-orm'

async function verify() {
  const db = await dbConnect()

  console.log('--- Top debtors per tenant ---')
  const debtors = await db.execute(sql`
    SELECT t.slug AS tenant, c.name, c.total_debt, c.first_debt_at, c.last_debt_activity_at
    FROM customers c
    JOIN tenants t ON t.id = c.tenant_id
    WHERE c.total_debt > 0
    ORDER BY t.id, c.total_debt DESC
    LIMIT 12
  `)
  console.log(JSON.stringify(debtors[0] ?? debtors, null, 2))

  console.log('\n--- Partial payments per shop (amount_owed > 0) ---')
  const openDebts = await db.execute(sql`
    SELECT
      t.slug AS tenant,
      SUM(CASE WHEN entity = 'sale' THEN 1 ELSE 0 END)     AS open_sales,
      SUM(CASE WHEN entity = 'invoice' THEN 1 ELSE 0 END)  AS open_invoices,
      SUM(CASE WHEN entity = 'sale' THEN amount_owed ELSE 0 END)    AS sales_owed,
      SUM(CASE WHEN entity = 'invoice' THEN amount_owed ELSE 0 END) AS invoices_owed
    FROM (
      SELECT 'sale' AS entity, tenant_id, amount_owed FROM sales WHERE amount_owed > 0
      UNION ALL
      SELECT 'invoice' AS entity, tenant_id, amount_owed FROM invoices WHERE amount_owed > 0
    ) open
    JOIN tenants t ON t.id = open.tenant_id
    GROUP BY t.slug
    ORDER BY t.slug
  `)
  console.log(JSON.stringify(openDebts[0] ?? openDebts, null, 2))

  console.log('\n--- Sample debt ledger for one debtor ---')
  const ledger = await db.execute(sql`
    SELECT c.name, dl.amount, dl.type, dl.notes, dl.balance_after, dl.created_at
    FROM debt_ledger dl
    JOIN customers c ON c.id = dl.customer_id
    WHERE c.total_debt > 0
    ORDER BY dl.created_at, dl.id
    LIMIT 12
  `)
  console.log(JSON.stringify(ledger[0] ?? ledger, null, 2))

  process.exit(0)
}

verify().catch((err) => {
  console.error('Verify failed:', err)
  process.exit(1)
})
