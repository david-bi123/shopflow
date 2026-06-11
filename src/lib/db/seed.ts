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
import { tenants, users, settings as settingsTable, customers, sales, invoices, auditLogs, subscriptions } from './schema'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { eq, sql } from 'drizzle-orm'

interface TaxItem {
  name: string
  rate: number
  amount: number
}

interface ShopData {
  name: string
  slug: string
  currency: string
  timezone: string
  phone: string
  email: string
  address: string
  description: string
  taxNumber: string
  taxes: { name: string; rate: number; enabled: boolean }[]
  /** Probability that any given sale will have a discount applied. */
  discountProbability: number
  /** Maximum discount percentage applied to a sale. */
  maxDiscountPercent: number
}

const GHANA_LOCATIONS = [
  '21 Independence Ave, Accra, Ghana',
  'Ring Road East, Osu, Accra',
  'Oxford Street, Osu, Accra',
  'Spintex Road, Tema, Ghana',
  'Kumasi Road, Tech Junction, Kumasi',
  'Tamale Road, Tamale, Northern Region',
  'Cape Coast Road, Cape Coast',
  'Takoradi Market Road, Sekondi-Takoradi',
  'Koforidua-Eastern Region',
  'Ho-Volta Region',
]

const GHANA_PHONES = [
  '+233 24 555 0101',
  '+233 20 555 0202',
  '+233 27 555 0303',
  '+233 28 555 0404',
  '+233 30 555 0505',
]

const GHANA_TIN = ['TIN-0001234567', 'TIN-C0001234567', 'GRA-P00234567-8', 'GRA-C0009876543']

const DEFAULT_TAXES_GH = [
  { name: 'VAT', rate: 15, enabled: true },
  { name: 'NHIS', rate: 2.5, enabled: true },
  { name: 'GET Fund', rate: 2.5, enabled: true },
]

const shopData: ShopData[] = [
  {
    name: "Alice's Boutique",
    slug: 'alices-boutique',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    phone: '+233 24 123 4567',
    email: 'hello@alicesboutique.com',
    address: '21 Oxford Street, Osu, Accra, Ghana',
    description: 'Trendy women\u2019s fashion & accessories',
    taxNumber: GHANA_TIN[0],
    taxes: DEFAULT_TAXES_GH,
    discountProbability: 0.35,
    maxDiscountPercent: 15,
  },
  {
    name: "Bob's Pharmacy",
    slug: 'bobs-pharmacy',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    phone: '+233 20 234 5678',
    email: 'contact@bobpharmacy.com',
    address: 'Spintex Road, near KFC, Accra, Ghana',
    description: 'Licensed pharmacy \u00b7 Genuine medicines \u00b7 Open 24/7',
    taxNumber: GHANA_TIN[1],
    taxes: [
      { name: 'VAT', rate: 15, enabled: true },
      { name: 'NHIS', rate: 2.5, enabled: false },
      { name: 'GET Fund', rate: 2.5, enabled: false },
    ],
    discountProbability: 0.2,
    maxDiscountPercent: 8,
  },
  {
    name: "Charlie's Electronics",
    slug: 'charlies-electronics',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    phone: '+233 27 345 6789',
    email: 'sales@charlieselectronics.com',
    address: 'Ring Road East, near A&C Mall, Accra, Ghana',
    description: 'Phones \u00b7 Laptops \u00b7 Home Appliances \u00b7 Genuine warranty',
    taxNumber: GHANA_TIN[2],
    taxes: DEFAULT_TAXES_GH,
    discountProbability: 0.5,
    maxDiscountPercent: 20,
  },
]

const ownerEmails = [
  'owner@alice.com',
  'owner@bob.com',
  'owner@charlie.com',
]

function computeTaxItems(subtotalAfterDiscount: number, taxes: { name: string; rate: number; enabled: boolean }[]): TaxItem[] {
  return taxes
    .filter((t) => t.enabled)
    .map((t) => ({
      name: t.name,
      rate: t.rate,
      amount: Math.round(subtotalAfterDiscount * t.rate) / 100,
    }))
}

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

  const tenantRecords: Array<{ id: number; slug: string }> = []
  const ownerRecords: Array<{ id: number; tenantId: number; name: string; email: string }> = []

  for (let i = 0; i < shopData.length; i++) {
    const shop = shopData[i]
    console.log(`Seeding tenant: ${shop.name}...`)

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
      storePhone: shop.phone,
      storeEmail: shop.email,
      storeAddress: shop.address,
      storeDescription: shop.description,
      taxNumber: shop.taxNumber,
      currency: shop.currency,
      timezone: shop.timezone,
      taxRate: 0, // legacy; taxes array below is the source of truth
      taxes: shop.taxes,
      receiptFooter: 'Thank you for shopping with us!',
      defaultPaymentMethods: ['cash', 'mobile_money', 'card'],
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
        phone: faker.helpers.arrayElement(GHANA_PHONES),
        address: faker.helpers.arrayElement(GHANA_LOCATIONS),
        createdBy: owner.id,
        createdAt: now2,
        updatedAt: now2,
      }).$returningId()
      const [customer] = await db.select().from(customers).where(eq(customers.id, result[0].id)).limit(1)
      allCustomerRecords.push({ id: customer.id, tenantId: customer.tenantId, name: customer.name, phone: customer.phone, email: customer.email })
    }
  }

  console.log('Seeding sales (with percentage discount + tax items)...')
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
    const shop = shopData[i]

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
      const discountPercent = faker.helpers.maybe(
        () => Number(faker.number.float({ min: 1, max: shop.maxDiscountPercent, fractionDigits: 2 }).toFixed(2)),
        { probability: shop.discountProbability }
      ) ?? 0
      const discount = Math.round(subtotal * discountPercent) / 100
      const afterDiscount = Math.max(0, subtotal - discount)
      const taxItems = computeTaxItems(afterDiscount, shop.taxes)
      const tax = Math.round(taxItems.reduce((sum, t) => sum + t.amount, 0) * 100) / 100
      const total = Math.round((afterDiscount + tax) * 100) / 100

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
        discountPercent,
        discount,
        tax,
        taxItems,
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

  console.log('Seeding invoices (with percentage discount + tax items)...')
  const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const
  let totalInvoices = 0
  for (let i = 0; i < tenantRecords.length; i++) {
    const tenant = tenantRecords[i]
    const owner = ownerRecords[i]
    const shop = shopData[i]
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
      const discountPercent = faker.helpers.maybe(
        () => Number(faker.number.float({ min: 1, max: shop.maxDiscountPercent, fractionDigits: 2 }).toFixed(2)),
        { probability: 0.3 }
      ) ?? 0
      const discount = Math.round(subtotal * discountPercent) / 100
      const afterDiscount = Math.max(0, subtotal - discount)
      const taxItems = computeTaxItems(afterDiscount, shop.taxes)
      const tax = Math.round(taxItems.reduce((sum, t) => sum + t.amount, 0) * 100) / 100
      const total = Math.round((afterDiscount + tax) * 100) / 100

      const customer = faker.helpers.arrayElement(tenantCustomers)

      await db.insert(invoices).values({
        tenantId: tenant.id,
        invoiceNumber: `INV-${tenant.slug.toUpperCase().slice(0, 3)}-${String(j + 1).padStart(4, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: faker.helpers.arrayElement(GHANA_LOCATIONS),
        items,
        subtotal,
        discountPercent,
        discount,
        tax,
        taxItems,
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
  console.log('--- Login Credentials ---')
  console.log('  Super Admin:  super@indflow.com / Admin123!')
  console.log(`  Alice Owner:  ${ownerEmails[0]} / IndFlow123!`)
  console.log(`  Bob Owner:    ${ownerEmails[1]} / IndFlow123!`)
  console.log(`  Charlie Owner: ${ownerEmails[2]} / IndFlow123!`)
  console.log('')
  console.log('--- Default Taxes (per shop) ---')
  for (const shop of shopData) {
    console.log(`  ${shop.name}: ${shop.taxes.map((t) => `${t.name} ${t.rate}%${t.enabled ? '' : ' (off)'}`).join(', ')}`)
  }

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
