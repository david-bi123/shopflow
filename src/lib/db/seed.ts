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
import { users } from './schema'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'

/**
 * Seeds only the super admin account.
 *
 * Shops are NOT seeded here on purpose — the platform is a curated,
 * super-admin-managed marketplace. The super admin creates shops from
 * the admin dashboard (`/admin/shops` -> "Create Shop"), providing the
 * shop name plus the default owner email/password. Owners then log in
 * and manage their own shop (staff, settings, etc.).
 *
 * Run with:  `npm run seed`
 */
async function seed() {
  console.log('Connecting to database...')
  const db = await dbConnect()

  console.log('Clearing existing data...')
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
  const tables = [
    'debt_ledger',
    'announcements',
    'audit_logs',
    'sales',
    'invoices',
    'customers',
    'notifications',
    'settings',
    'subscriptions',
    'users',
    'counters',
    'tenants',
  ]
  for (const table of tables) {
    await db.execute(sql`DELETE FROM ${sql.identifier(table)}`)
  }
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)

  console.log('Seeding super admin...')
  const now = new Date().toISOString()

  console.log('Ensuring system tenant (sentinel for orphan audit rows)...')
  await db.execute(sql`INSERT IGNORE INTO \`tenants\` (\`id\`, \`name\`, \`slug\`, \`status\`, \`subscription_status\`, \`created_at\`, \`updated_at\`) VALUES (0, '__system__', '__system__', 'active', 'active', ${now}, ${now})`)

  await db.insert(users).values({
    name: 'Super Admin',
    email: 'super@indflow.com',
    password: await bcrypt.hash('Admin123!', 12),
    role: 'super_admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  console.log('\n--- Seed Complete! ---')
  console.log('  Super Admin: 1')
  console.log('')
  console.log('--- Login Credentials ---')
  console.log('  Super Admin:  super@indflow.com / Admin123!')
  console.log('')
  console.log('--- Shops ---')
  console.log('  No shops seeded. Create them from the Super Admin dashboard (/admin).')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
