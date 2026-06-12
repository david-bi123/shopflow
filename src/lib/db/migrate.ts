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
    // --- Debt tracking ---
    { table: 'sales', column: 'amount_paid', ddl: 'ALTER TABLE `sales` ADD COLUMN `amount_paid` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'sales', column: 'amount_owed', ddl: 'ALTER TABLE `sales` ADD COLUMN `amount_owed` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'invoices', column: 'amount_paid', ddl: 'ALTER TABLE `invoices` ADD COLUMN `amount_paid` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'invoices', column: 'amount_owed', ddl: 'ALTER TABLE `invoices` ADD COLUMN `amount_owed` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'customers', column: 'total_debt', ddl: 'ALTER TABLE `customers` ADD COLUMN `total_debt` DOUBLE NOT NULL DEFAULT 0' },
    { table: 'customers', column: 'first_debt_at', ddl: 'ALTER TABLE `customers` ADD COLUMN `first_debt_at` VARCHAR(50)' },
    { table: 'customers', column: 'last_debt_activity_at', ddl: 'ALTER TABLE `customers` ADD COLUMN `last_debt_activity_at` VARCHAR(50)' },
  ]

  for (const { table, column, ddl } of alters) {
    try {
      console.log(`  -> ${table}.${column}`)
      await db.execute(sql.raw(ddl))
      console.log('     ok')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const code = (err as { cause?: { code?: string; errno?: number } })?.cause?.code
      const errno = (err as { cause?: { errno?: number } })?.cause?.errno
      const isDuplicate =
        msg.includes('Duplicate column') ||
        msg.includes('already exists') ||
        code === 'ER_DUP_FIELDNAME' ||
        errno === 1060 ||
        msg.includes('CREATE TABLE') === false && msg.includes('exist') === false && (code === '42S21' || errno === 1060)
      const isAlreadyExists =
        msg.includes('already exists') ||
        (err as { cause?: { code?: string } })?.cause?.code === 'ER_TABLE_EXISTS_ERROR'
      if (isDuplicate || isAlreadyExists) {
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

  // --- debt_ledger table ---
  console.log('  -> debt_ledger table')
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`debt_ledger\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`customer_id\` INT NOT NULL,
        \`amount\` DOUBLE NOT NULL,
        \`type\` VARCHAR(30) NOT NULL,
        \`reference_type\` VARCHAR(20),
        \`reference_id\` INT,
        \`notes\` TEXT,
        \`balance_after\` DOUBLE NOT NULL DEFAULT 0,
        \`created_by\` INT NOT NULL,
        \`created_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`debt_tenant_customer_created_idx\` (\`tenant_id\`, \`customer_id\`, \`created_at\`),
        INDEX \`debt_tenant_customer_idx\` (\`tenant_id\`, \`customer_id\`),
        INDEX \`debt_tenant_reference_idx\` (\`tenant_id\`, \`reference_type\`, \`reference_id\`)
      )
    `)
    console.log('     ok')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('already exists')) console.log('     already exists, skipping')
    else throw err
  }

  console.log('\n--- Migration complete ---')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
