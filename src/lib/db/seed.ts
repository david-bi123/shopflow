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
import { tenants, users, settings as settingsTable, customers, sales, invoices, auditLogs, announcements, subscriptions } from './schema'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { eq, sql } from 'drizzle-orm'

async function seed() {
  console.log('Connecting to database...')
  const db = await dbConnect()

  console.log('Clearing existing data...')
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
  const tables = ['announcements', 'audit_logs', 'sales', 'invoices', 'customers', 'notifications', 'settings', 'subscriptions', 'users', 'counters', 'tenants']
  for (const table of tables) {
    await db.execute(sql`DELETE FROM ${sql.identifier(table)}`)
  }
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)

  console.log('Seeding super admin...')
  const now = new Date().toISOString()
  await db.insert(users).values({
    name: 'Super Admin',
    email: 'super@indflow.com',
    password: await bcrypt.hash('Admin123!', 12),
    role: 'super_admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })
  const [superAdmin] = await db.select().from(users).where(eq(users.email, 'super@indflow.com')).limit(1)

  const shopData = [
    { name: "Alice's Boutique", slug: 'alices-boutique', currency: 'GHS', timezone: 'Africa/Accra' },
    { name: "Bob's Pharmacy", slug: 'bobs-pharmacy', currency: 'GHS', timezone: 'Africa/Accra' },
    { name: "Charlie's Electronics", slug: 'charlies-electronics', currency: 'GHS', timezone: 'Africa/Accra' },
  ]

  const ownerEmails = [
    'owner@alice.com',
    'owner@bob.com',
    'owner@charlie.com',
  ]

  const tenantRecords: Array<{ id: number; slug: string }> = []
  const ownerRecords: Array<{ id: number; tenantId: number; name: string; email: string }> = []

  for (let i = 0; i < shopData.length; i++) {
    const shop = shopData[i]

    const ts = new Date().toISOString()
    await db.insert(tenants).values({
      name: shop.name,
      slug: shop.slug,
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionPlan: 'business',
      createdAt: ts,
      updatedAt: ts,
    })
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, shop.slug)).limit(1)
    tenantRecords.push({ id: tenant.id, slug: tenant.slug })

    await db.insert(settingsTable).values({
      tenantId: tenant.id,
      storeName: shop.name,
      storePhone: faker.phone.number(),
      storeEmail: faker.internet.email(),
      storeAddress: faker.location.streetAddress(),
      currency: shop.currency,
      timezone: shop.timezone,
      taxRate: faker.number.int({ min: 5, max: 15 }),
      receiptFooter: 'Thank you for your purchase!',
      defaultPaymentMethods: ['cash', 'card', 'mobile_money'],
      createdAt: ts,
      updatedAt: ts,
    })

    await db.insert(subscriptions).values({
      tenantId: tenant.id,
      plan: 'business',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: faker.date.future().toISOString(),
      createdAt: ts,
      updatedAt: ts,
    })

    await db.insert(users).values({
      tenantId: tenant.id,
      name: faker.person.fullName(),
      email: ownerEmails[i],
      password: await bcrypt.hash('IndFlow123!', 12),
      role: 'owner',
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    })
    const [owner] = await db.select().from(users).where(eq(users.email, ownerEmails[i])).limit(1)
    ownerRecords.push({ id: owner.id, tenantId: owner.tenantId!, name: owner.name, email: owner.email })

    await db.insert(users).values({
      tenantId: tenant.id,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await bcrypt.hash('IndFlow123!', 12),
      role: 'admin',
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    })

    await db.insert(users).values({
      tenantId: tenant.id,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await bcrypt.hash('IndFlow123!', 12),
      role: 'staff',
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    })
  }

  console.log('Seeding customers...')
  const allCustomerRecords: Array<{ id: number; tenantId: number; name: string; phone: string | null; email: string | null }> = []
  for (let i = 0; i < tenantRecords.length; i++) {
    const tenant = tenantRecords[i]
    const owner = ownerRecords[i]
    for (let j = 0; j < 10; j++) {
      const now2 = new Date().toISOString()
      const result = await db.insert(customers).values({
        tenantId: tenant.id,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        createdBy: owner.id,
        createdAt: now2,
        updatedAt: now2,
      }).$returningId()
      const [customer] = await db.select().from(customers).where(eq(customers.id, result[0].id)).limit(1)
      allCustomerRecords.push({ id: customer.id, tenantId: customer.tenantId, name: customer.name, phone: customer.phone, email: customer.email })
    }
  }

  console.log('Seeding sales...')
  const paymentMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'] as const
  const productNames = [
    'Widget A', 'Widget B', 'Widget C', 'Gadget X', 'Gadget Y',
    'Premium Service', 'Basic Kit', 'Pro Bundle', 'Starter Pack', 'Deluxe Edition',
    'Cloud Subscription', 'Hardware Dongle', 'Accessory Set', 'Replacement Part', 'Gift Card',
  ]

  let totalSales = 0
  for (let i = 0; i < tenantRecords.length; i++) {
    const tenant = tenantRecords[i]
    const owner = ownerRecords[i]

    const staffResult = await db.select().from(users).where(eq(users.tenantId, tenant.id))
    const tenantStaff = staffResult.filter(s => s.role !== 'owner')
    const tenantCustomers = allCustomerRecords.filter(c => c.tenantId === tenant.id)

    for (let j = 0; j < 33; j++) {
      const numItems = faker.number.int({ min: 1, max: 5 })
      const items = Array.from({ length: numItems }, () => {
        const qty = faker.number.int({ min: 1, max: 10 })
        const price = Number(faker.number.float({ min: 5, max: 500, fractionDigits: 2 }).toFixed(2))
        return {
          name: faker.helpers.arrayElement(productNames),
          quantity: qty,
          price,
          subtotal: Math.round(qty * price * 100) / 100,
        }
      })

      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
      const discount = faker.helpers.maybe(() =>
        Number(faker.number.float({ min: 0, max: subtotal * 0.2, fractionDigits: 2 }).toFixed(2))
      , { probability: 0.3 }) ?? 0
      const tax = Math.round((subtotal - discount) * Number(faker.number.float({ min: 0.05, max: 0.15, fractionDigits: 2 }).toFixed(2)) * 100) / 100
      const total = Math.round((subtotal - discount + tax) * 100) / 100

      const customer = faker.helpers.arrayElement(tenantCustomers)
      const randomStaff = faker.helpers.arrayElement([...tenantStaff, owner])

      const saleCreatedAt = faker.date.between({ from: new Date('2025-01-01'), to: new Date() }).toISOString()
      await db.insert(sales).values({
        tenantId: tenant.id,
        saleNumber: `SALE-${tenant.slug.toUpperCase().slice(0, 3)}-${String(j + 1).padStart(4, '0')}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerId: customer.id,
        items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: faker.helpers.arrayElement([...paymentMethods]),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdBy: randomStaff.id,
        createdAt: saleCreatedAt,
        updatedAt: saleCreatedAt,
      })
      totalSales++
    }
  }

  console.log('Seeding invoices...')
  const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const
  let totalInvoices = 0
  for (let i = 0; i < tenantRecords.length; i++) {
    const tenant = tenantRecords[i]
    const owner = ownerRecords[i]
    const tenantCustomers = allCustomerRecords.filter(c => c.tenantId === tenant.id)

    for (let j = 0; j < 10; j++) {
      const numItems = faker.number.int({ min: 1, max: 4 })
      const items = Array.from({ length: numItems }, () => {
        const qty = faker.number.int({ min: 1, max: 5 })
        const price = Number(faker.number.float({ min: 10, max: 300, fractionDigits: 2 }).toFixed(2))
        const total = Math.round(qty * price * 100) / 100
        return {
          name: faker.helpers.arrayElement(productNames),
          description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
          quantity: qty,
          price,
          total,
        }
      })

      const subtotal = items.reduce((sum, item) => sum + item.total, 0)
      const discount = faker.helpers.maybe(() =>
        Number(faker.number.float({ min: 0, max: subtotal * 0.15, fractionDigits: 2 }).toFixed(2))
      , { probability: 0.25 }) ?? 0
      const tax = Math.round((subtotal - discount) * Number(faker.number.float({ min: 0.05, max: 0.15, fractionDigits: 2 }).toFixed(2)) * 100) / 100
      const total = Math.round((subtotal - discount + tax) * 100) / 100

      const customer = faker.helpers.arrayElement(tenantCustomers)

      await db.insert(invoices).values({
        tenantId: tenant.id,
        invoiceNumber: `INV-${tenant.slug.toUpperCase().slice(0, 3)}-${String(j + 1).padStart(4, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items,
        subtotal,
        discount,
        tax,
        total,
        status: faker.helpers.arrayElement([...invoiceStatuses]),
        dueDate: faker.date.between({ from: new Date('2025-02-01'), to: new Date('2025-12-31') }).toISOString(),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdBy: owner.id,
        createdAt: faker.date.between({ from: new Date('2025-01-01'), to: new Date() }).toISOString(),
        updatedAt: faker.date.between({ from: new Date('2025-01-01'), to: new Date() }).toISOString(),
      })
      totalInvoices++
    }
  }

  console.log('Seeding audit logs...')
  for (let i = 0; i < tenantRecords.length; i++) {
    const tenant = tenantRecords[i]
    const owner = ownerRecords[i]
    for (let j = 0; j < 5; j++) {
      await db.insert(auditLogs).values({
        tenantId: tenant.id,
        action: faker.helpers.arrayElement(['sale.created', 'invoice.created', 'invoice.paid', 'customer.added', 'staff.invited']),
        entity: faker.helpers.arrayElement(['Sale', 'Invoice', 'Customer', 'Staff']),
        createdAt: new Date().toISOString(),
        performedBy: owner.id,
        performedByName: owner.name,
        details: { description: faker.lorem.sentence() },
      })
    }
  }

  console.log('\n--- Seed Complete! ---')
  console.log(`  Super Admin: 1`)
  console.log(`  Tenants: ${tenantRecords.length}`)
  console.log(`  Owners: ${ownerRecords.length}`)
  console.log(`  Customers: ${allCustomerRecords.length}`)
  console.log(`  Sales: ${totalSales}`)
  console.log(`  Invoices: ${totalInvoices}`)
  console.log(`  Audit Logs: ${tenantRecords.length * 5}`)
  console.log('')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
