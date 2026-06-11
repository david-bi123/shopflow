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

import { dbConnect } from './connect'
import { sql } from 'drizzle-orm'

/**
 * Add new columns to existing tables without dropping data. Idempotent:
 * if a column already exists the ALTER will fail silently and we move on.
 */
async function migrate() {
  console.log('Connecting to database...')
  const db = await dbConnect()

  const alters: { table: string; column: string; ddl: string }[] = [
    { table: 'sales', column: 'discount_percent', ddl: 'ALTER TABLE `sales` ADD COLUMN `discount_percent` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'sales', column: 'tax_items', ddl: 'ALTER TABLE `sales` ADD COLUMN `tax_items` JSON NOT NULL' },
    { table: 'invoices', column: 'discount_percent', ddl: 'ALTER TABLE `invoices` ADD COLUMN `discount_percent` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'invoices', column: 'tax_items', ddl: 'ALTER TABLE `invoices` ADD COLUMN `tax_items` JSON NOT NULL' },
    { table: 'settings', column: 'store_description', ddl: 'ALTER TABLE `settings` ADD COLUMN `store_description` TEXT' },
    { table: 'settings', column: 'tax_number', ddl: 'ALTER TABLE `settings` ADD COLUMN `tax_number` VARCHAR(100)' },
    { table: 'settings', column: 'taxes', ddl: 'ALTER TABLE `settings` ADD COLUMN `taxes` JSON NOT NULL' },
  ]

  for (const { table, column, ddl } of alters) {
    try {
      console.log(`  -> ${table}.${column}`)
      await db.execute(sql.raw(ddl))
      console.log('     ok')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Duplicate column') || msg.includes('already exists') || msg.includes('ER_DUP_FIELDNAME')) {
        console.log('     already exists, skipping')
      } else {
        throw err
      }
    }
  }

  // Backfill any existing tax_items / taxes to a safe empty array so the
  // existing rows still pass strict NOT NULL on next read.
  console.log('  -> backfilling empty JSON arrays on existing rows')
  await db.execute(sql`UPDATE \`sales\` SET \`tax_items\` = JSON_ARRAY() WHERE \`tax_items\` IS NULL OR JSON_LENGTH(\`tax_items\`) IS NULL`)
  await db.execute(sql`UPDATE \`invoices\` SET \`tax_items\` = JSON_ARRAY() WHERE \`tax_items\` IS NULL OR JSON_LENGTH(\`tax_items\`) IS NULL`)
  await db.execute(sql`UPDATE \`settings\` SET \`taxes\` = JSON_ARRAY() WHERE \`taxes\` IS NULL OR JSON_LENGTH(\`taxes\`) IS NULL`)

  console.log('\n--- Migration complete ---')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
