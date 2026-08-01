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
 * Idempotent schema sync.
 *
 * Strategy:
 *   1. `CREATE TABLE IF NOT EXISTS` for every table in the schema,
 *      using the same Drizzle-generated DDL. This makes a fresh
 *      database work in one shot.
 *   2. `ALTER TABLE … ADD COLUMN` for any column we may have added
 *      in a later release. Each ALTER is its own statement and is
 *      wrapped in try/catch — if the column already exists the
 *      `ER_DUP_FIELDNAME` (errno 1060) error is swallowed.
 *   3. Backfill any `NOT NULL JSON` column with `[]` so existing
 *      rows don't trip the constraint on the next read.
 *
 * Run with:  `npm run migrate`
 */

interface Alter {
  table: string
  column: string
  ddl: string
}

const alters: Alter[] = [
  // Sales / invoices: discount + tax breakdowns (added after v0.1)
  { table: 'sales', column: 'discount_percent', ddl: 'ALTER TABLE `sales` ADD COLUMN `discount_percent` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'sales', column: 'tax_items', ddl: 'ALTER TABLE `sales` ADD COLUMN `tax_items` JSON NOT NULL' },
  { table: 'invoices', column: 'discount_percent', ddl: 'ALTER TABLE `invoices` ADD COLUMN `discount_percent` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'invoices', column: 'tax_items', ddl: 'ALTER TABLE `invoices` ADD COLUMN `tax_items` JSON NOT NULL' },

  // Settings: extra store / tax fields
  { table: 'settings', column: 'store_description', ddl: 'ALTER TABLE `settings` ADD COLUMN `store_description` TEXT' },
  { table: 'settings', column: 'tax_number', ddl: 'ALTER TABLE `settings` ADD COLUMN `tax_number` VARCHAR(100)' },
  { table: 'settings', column: 'taxes', ddl: 'ALTER TABLE `settings` ADD COLUMN `taxes` JSON NOT NULL' },

  // Debt tracking: amount paid / owed + customer cached balance
  { table: 'sales', column: 'amount_paid', ddl: 'ALTER TABLE `sales` ADD COLUMN `amount_paid` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'sales', column: 'amount_owed', ddl: 'ALTER TABLE `sales` ADD COLUMN `amount_owed` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'invoices', column: 'amount_paid', ddl: 'ALTER TABLE `invoices` ADD COLUMN `amount_paid` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'invoices', column: 'amount_owed', ddl: 'ALTER TABLE `invoices` ADD COLUMN `amount_owed` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'customers', column: 'total_debt', ddl: 'ALTER TABLE `customers` ADD COLUMN `total_debt` DOUBLE NOT NULL DEFAULT 0' },
  { table: 'customers', column: 'first_debt_at', ddl: 'ALTER TABLE `customers` ADD COLUMN `first_debt_at` VARCHAR(50)' },
  { table: 'customers', column: 'last_debt_activity_at', ddl: 'ALTER TABLE `customers` ADD COLUMN `last_debt_activity_at` VARCHAR(50)' },

  // Customers: soft-delete tombstone (PII anonymization + right-to-erasure)
  { table: 'customers', column: 'deleted_at', ddl: 'ALTER TABLE `customers` ADD COLUMN `deleted_at` VARCHAR(50)' },

  // Audit log: capture client IP / user-agent (added for SOC2-style auditing)
  { table: 'audit_logs', column: 'ip', ddl: 'ALTER TABLE `audit_logs` ADD COLUMN `ip` TEXT' },
  { table: 'audit_logs', column: 'user_agent', ddl: 'ALTER TABLE `audit_logs` ADD COLUMN `user_agent` TEXT' },

  // Sales: optional waybill / company reference numbers
  { table: 'sales', column: 'waybill_no', ddl: 'ALTER TABLE `sales` ADD COLUMN `waybill_no` VARCHAR(100)' },
  { table: 'sales', column: 'company_ref_no', ddl: 'ALTER TABLE `sales` ADD COLUMN `company_ref_no` VARCHAR(100)' },
  { table: 'sales', column: 'car_no', ddl: 'ALTER TABLE `sales` ADD COLUMN `car_no` VARCHAR(100)' },
]

const createTableStatements: { name: string; ddl: string }[] = [
  {
    name: 'tenants',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`tenants\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
        \`subscription_status\` VARCHAR(20) NOT NULL DEFAULT 'trial',
        \`subscription_plan\` VARCHAR(50),
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`tenant_slug_idx\` (\`slug\`),
        INDEX \`tenant_status_idx\` (\`status\`)
      )
    `,
  },
  {
    name: 'users',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL,
        \`permissions\` JSON,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
        \`last_login\` TEXT,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`user_email_idx\` (\`email\`),
        INDEX \`user_tenant_role_idx\` (\`tenant_id\`, \`role\`)
      )
    `,
  },
  {
    name: 'customers',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255),
        \`phone\` VARCHAR(50),
        \`address\` TEXT,
        \`notes\` TEXT,
        \`total_sales\` INT NOT NULL DEFAULT 0,
        \`total_revenue\` DOUBLE NOT NULL DEFAULT 0,
        \`total_debt\` DOUBLE NOT NULL DEFAULT 0,
        \`first_debt_at\` VARCHAR(50),
        \`last_debt_activity_at\` VARCHAR(50),
        \`created_by\` INT NOT NULL,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        \`deleted_at\` VARCHAR(50),
        PRIMARY KEY (\`id\`),
        INDEX \`customer_tenant_name_idx\` (\`tenant_id\`, \`name\`),
        INDEX \`customer_tenant_phone_idx\` (\`tenant_id\`, \`phone\`),
        INDEX \`customer_tenant_email_idx\` (\`tenant_id\`, \`email\`),
        INDEX \`customer_tenant_debt_idx\` (\`tenant_id\`, \`total_debt\`),
        INDEX \`customer_tenant_deleted_idx\` (\`tenant_id\`, \`deleted_at\`)
      )
    `,
  },
  {
    name: 'sales',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`sales\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`sale_number\` VARCHAR(50) NOT NULL,
        \`customer_name\` VARCHAR(255),
        \`customer_phone\` VARCHAR(50),
        \`customer_id\` INT,
        \`items\` JSON NOT NULL,
        \`subtotal\` DOUBLE NOT NULL,
        \`discount_percent\` DOUBLE NOT NULL DEFAULT 0,
        \`discount\` DOUBLE NOT NULL DEFAULT 0,
        \`tax\` DOUBLE NOT NULL DEFAULT 0,
        \`tax_items\` JSON NOT NULL,
        \`total\` DOUBLE NOT NULL,
        \`amount_paid\` DOUBLE NOT NULL DEFAULT 0,
        \`amount_owed\` DOUBLE NOT NULL DEFAULT 0,
        \`payment_method\` VARCHAR(20) NOT NULL,
        \`notes\` TEXT,
        \`created_by\` INT NOT NULL,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`sale_tenant_number_idx\` (\`tenant_id\`, \`sale_number\`),
        INDEX \`sale_tenant_created_idx\` (\`tenant_id\`, \`created_at\`),
        INDEX \`sale_tenant_customer_idx\` (\`tenant_id\`, \`customer_id\`),
        INDEX \`sale_tenant_owed_idx\` (\`tenant_id\`, \`amount_owed\`)
      )
    `,
  },
  {
    name: 'invoices',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`invoice_number\` VARCHAR(50) NOT NULL,
        \`customer_id\` INT,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`customer_email\` VARCHAR(255),
        \`customer_phone\` VARCHAR(50),
        \`customer_address\` TEXT,
        \`items\` JSON NOT NULL,
        \`subtotal\` DOUBLE NOT NULL,
        \`discount_percent\` DOUBLE NOT NULL DEFAULT 0,
        \`discount\` DOUBLE NOT NULL DEFAULT 0,
        \`tax\` DOUBLE NOT NULL DEFAULT 0,
        \`tax_items\` JSON NOT NULL,
        \`total\` DOUBLE NOT NULL,
        \`amount_paid\` DOUBLE NOT NULL DEFAULT 0,
        \`amount_owed\` DOUBLE NOT NULL DEFAULT 0,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft',
        \`due_date\` VARCHAR(50) NOT NULL,
        \`notes\` TEXT,
        \`created_by\` INT NOT NULL,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`invoice_tenant_number_idx\` (\`tenant_id\`, \`invoice_number\`),
        INDEX \`invoice_tenant_status_idx\` (\`tenant_id\`, \`status\`),
        INDEX \`invoice_tenant_customer_idx\` (\`tenant_id\`, \`customer_id\`),
        INDEX \`invoice_tenant_due_idx\` (\`tenant_id\`, \`due_date\`),
        INDEX \`invoice_tenant_owed_idx\` (\`tenant_id\`, \`amount_owed\`)
      )
    `,
  },
  {
    name: 'debt_ledger',
    ddl: `
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
    `,
  },
  {
    name: 'counters',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`counters\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`sequence\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`counter_tenant_name_idx\` (\`tenant_id\`, \`name\`)
      )
    `,
  },
  {
    name: 'notifications',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`type\` TEXT NOT NULL,
        \`title\` TEXT NOT NULL,
        \`message\` TEXT NOT NULL,
        \`link\` TEXT,
        \`read\` TINYINT NOT NULL DEFAULT 0,
        \`created_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`notif_tenant_user_read_idx\` (\`tenant_id\`, \`user_id\`, \`read\`),
        INDEX \`notif_tenant_created_idx\` (\`tenant_id\`, \`created_at\`)
      )
    `,
  },
  {
    name: 'audit_logs',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`entity\` TEXT NOT NULL,
        \`entity_id\` TEXT,
        \`performed_by\` INT NOT NULL,
        \`performed_by_name\` TEXT NOT NULL,
        \`details\` JSON,
        \`ip\` TEXT,
        \`user_agent\` TEXT,
        \`created_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`audit_tenant_created_idx\` (\`tenant_id\`, \`created_at\`),
        INDEX \`audit_tenant_action_idx\` (\`tenant_id\`, \`action\`),
        INDEX \`audit_tenant_user_idx\` (\`tenant_id\`, \`performed_by\`)
      )
    `,
  },
  {
    name: 'settings',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`settings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`store_name\` VARCHAR(255) NOT NULL,
        \`store_phone\` VARCHAR(50),
        \`store_email\` VARCHAR(255),
        \`store_address\` TEXT,
        \`store_description\` TEXT,
        \`tax_number\` VARCHAR(100),
        \`logo\` VARCHAR(500),
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'GHS',
        \`timezone\` VARCHAR(50) NOT NULL DEFAULT 'UTC',
        \`tax_rate\` DOUBLE NOT NULL DEFAULT 0,
        \`taxes\` JSON NOT NULL,
        \`receipt_footer\` TEXT NOT NULL,
        \`default_payment_methods\` JSON NOT NULL,
        \`show_logo_on_receipt\` TINYINT NOT NULL DEFAULT 1,
        \`show_qr_on_receipt\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`settings_tenant_idx\` (\`tenant_id\`)
      )
    `,
  },
  {
    name: 'subscriptions',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`subscriptions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` INT NOT NULL,
        \`plan\` VARCHAR(20) NOT NULL DEFAULT 'free',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'trial',
        \`trial_ends_at\` VARCHAR(50),
        \`current_period_start\` VARCHAR(50) NOT NULL,
        \`current_period_end\` VARCHAR(50),
        \`cancelled_at\` VARCHAR(50),
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`subscription_tenant_idx\` (\`tenant_id\`)
      )
    `,
  },
  {
    name: 'announcements',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`announcements\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`title\` VARCHAR(255) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`priority\` VARCHAR(10) NOT NULL DEFAULT 'medium',
        \`active\` TINYINT NOT NULL DEFAULT 1,
        \`created_by\` INT NOT NULL,
        \`created_at\` VARCHAR(50) NOT NULL,
        \`updated_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`announcement_active_created_idx\` (\`active\`, \`created_at\`)
      )
    `,
  },
  {
    name: 'password_reset_tokens',
    ddl: `
      CREATE TABLE IF NOT EXISTS \`password_reset_tokens\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`token_hash\` VARCHAR(64) NOT NULL,
        \`expires_at\` VARCHAR(50) NOT NULL,
        \`used_at\` VARCHAR(50),
        \`created_at\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`password_reset_token_hash_idx\` (\`token_hash\`),
        INDEX \`password_reset_user_idx\` (\`user_id\`),
        INDEX \`password_reset_expires_idx\` (\`expires_at\`)
      )
    `,
  },
]

function isAlreadyExists(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const code = (err as { cause?: { code?: string } })?.cause?.code
  const errno = (err as { cause?: { errno?: number } })?.cause?.errno
  return (
    msg.includes('Duplicate column') ||
    msg.includes('already exists') ||
    code === 'ER_DUP_FIELDNAME' ||
    code === 'ER_TABLE_EXISTS_ERROR' ||
    errno === 1060 ||
    errno === 1050
  )
}

async function migrate() {
  console.log('Connecting to database...')
  const db = await dbConnect()

  console.log('\n--- Step 1: CREATE TABLE ---')
  for (const { name, ddl } of createTableStatements) {
    try {
      console.log(`  -> ${name}`)
      await db.execute(sql.raw(ddl))
      console.log('     ok')
    } catch (err) {
      if (isAlreadyExists(err)) {
        console.log('     already exists, skipping')
      } else {
        throw err
      }
    }
  }

  console.log('\n--- Step 2: ALTER TABLE (additive columns) ---')
  for (const { table, column, ddl } of alters) {
    try {
      console.log(`  -> ${table}.${column}`)
      await db.execute(sql.raw(ddl))
      console.log('     ok')
    } catch (err) {
      if (isAlreadyExists(err)) {
        console.log('     already exists, skipping')
      } else {
        throw err
      }
    }
  }

  console.log('\n--- Step 3: Backfill empty JSON arrays ---')
  await db.execute(sql`UPDATE \`sales\` SET \`tax_items\` = JSON_ARRAY() WHERE \`tax_items\` IS NULL OR JSON_LENGTH(\`tax_items\`) IS NULL`)
  await db.execute(sql`UPDATE \`invoices\` SET \`tax_items\` = JSON_ARRAY() WHERE \`tax_items\` IS NULL OR JSON_LENGTH(\`tax_items\`) IS NULL`)
  await db.execute(sql`UPDATE \`settings\` SET \`taxes\` = JSON_ARRAY() WHERE \`taxes\` IS NULL OR JSON_LENGTH(\`taxes\`) IS NULL`)

  console.log('\n--- Step 3.5: Add COVID Tax to shop defaults ---')
  // Existing shops have their `settings.taxes` list stored in the DB, so
  // a new default line wouldn't appear for them. Append COVID Tax (1%)
  // to any shop that doesn't already have a tax named "COVID Tax".
  await db.execute(sql`UPDATE \`settings\` SET \`taxes\` = JSON_ARRAY_APPEND(\`taxes\`, '$', JSON_OBJECT('name', 'COVID Tax', 'rate', 1, 'enabled', true)) WHERE JSON_SEARCH(\`taxes\`, 'one', 'COVID Tax') IS NULL`)

  console.log('\n--- Step 4: System tenant (sentinel for orphan audit rows) ---')
  // tenant_id=0 is the "no real tenant" sentinel. The audit_logs
  // table is NOT NULL on tenant_id, so failed-login audits that have
  // no real user-to-tenant mapping (e.g. attempts against a non-existent
  // email) get attributed to this row. INSERT IGNORE keeps it idempotent.
  await db.execute(sql`INSERT IGNORE INTO \`tenants\` (\`id\`, \`name\`, \`slug\`, \`status\`, \`subscription_status\`, \`created_at\`, \`updated_at\`) VALUES (0, '__system__', '__system__', 'active', 'active', ${new Date().toISOString()}, ${new Date().toISOString()})`)

  console.log('\n--- Migration complete ---')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
