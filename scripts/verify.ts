// Quick verify script: dumps a few rows to confirm the new columns are populated.
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
  console.log('--- Settings (one row per tenant) ---')
  const settings = await db.execute(sql`SELECT tenant_id, store_name, store_phone, store_address, store_description, tax_number, taxes FROM settings`)
  console.log(JSON.stringify(settings, null, 2))

  console.log('\n--- Sales sample (showing new columns) ---')
  const sales = await db.execute(sql`SELECT id, sale_number, subtotal, discount_percent, discount, tax, tax_items, total FROM sales LIMIT 2`)
  console.log(JSON.stringify(sales, null, 2))

  console.log('\n--- Invoices sample (showing new columns) ---')
  const invoices = await db.execute(sql`SELECT id, invoice_number, subtotal, discount_percent, discount, tax, tax_items, total FROM invoices LIMIT 2`)
  console.log(JSON.stringify(invoices, null, 2))

  process.exit(0)
}

verify().catch((err) => {
  console.error('Verify failed:', err)
  process.exit(1)
})
