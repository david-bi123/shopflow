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
import { tenants, users, settings as settingsTable, customers, sales, invoices, auditLogs, subscriptions, debtLedger } from './schema'
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
  // Order doesn't matter with FK_CHECKS=0, but children first for
  // sanity: anything that holds a tenant_id / customer_id / user_id
  // is wiped before the rows they reference.
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

      // Debt probability per sale: ~25% (gives Alice ~8 outstanding sales).
      const isPartial = faker.helpers.maybe(() => true, { probability: 0.25 }) ?? false
      let amountPaid = total
      if (isPartial) {
        // Customer paid between 30% and 85% up front.
        const payRatio = faker.number.float({ min: 0.3, max: 0.85, fractionDigits: 2 })
        amountPaid = Math.round(total * payRatio * 100) / 100
      }
      const amountOwed = Math.max(0, Math.round((total - amountPaid) * 100) / 100)

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
        amountPaid,
        amountOwed,
        paymentMethod: faker.helpers.arrayElement([...paymentMethods]),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdBy: randomStaff.id,
        createdAt: saleCreatedAt,
        updatedAt: saleCreatedAt,
      })
      totalSales++

      // If partial, add to the customer's running debt (debt_ledger + cached totalDebt)
      if (amountOwed > 0.01) {
        // The customer object from earlier doesn't carry totalDebt, so we
        // do a tiny SQL lookup for the cached balance. The other tenanted
        // entries stay in memory so the running balance is correct.
        const [custRow] = await db
          .select({ totalDebt: customers.totalDebt })
          .from(customers)
          .where(eq(customers.id, customer.id))
          .limit(1)
        const previousBalance = custRow?.totalDebt ?? 0
        const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
        await db.insert(debtLedger).values({
          tenantId: tenant.id,
          customerId: customer.id,
          amount: amountOwed,
          type: 'sale_created',
          referenceType: 'sale',
          referenceId: null, // sale.id is auto-increment; we accept null for seeded data
          notes: `Sale SALE-${tenant.slug.toUpperCase().slice(0, 3)}-${String(j + 1).padStart(4, '0')} \u2014 paid ${amountPaid} of ${total}`,
          balanceAfter: newBalance,
          createdBy: randomStaff.id,
          createdAt: saleCreatedAt,
        })
        await db.update(customers).set({
          totalDebt: newBalance,
          firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${saleCreatedAt})`,
          lastDebtActivityAt: saleCreatedAt,
        }).where(eq(customers.id, customer.id))
      }
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

      // Invoices more often go out partially paid (B2B). ~30% partial.
      const isPartial = faker.helpers.maybe(() => true, { probability: 0.3 }) ?? false
      let amountPaid = total
      if (isPartial) {
        const payRatio = faker.number.float({ min: 0.2, max: 0.7, fractionDigits: 2 })
        amountPaid = Math.round(total * payRatio * 100) / 100
      }
      const amountOwed = Math.max(0, Math.round((total - amountPaid) * 100) / 100)

      const customer = faker.helpers.arrayElement(tenantCustomers)
      const createdAt = faker.date.between({ from: new Date('2025-01-01'), to: new Date() }).toISOString()

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
        amountPaid,
        amountOwed,
        status: faker.helpers.arrayElement([...invoiceStatuses]),
        dueDate: faker.date.between({ from: new Date('2025-02-01'), to: new Date('2025-12-31') }).toISOString(),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdBy: owner.id,
        createdAt,
        updatedAt: createdAt,
      })
      totalInvoices++

      if (amountOwed > 0.01) {
        const [custRow] = await db
          .select({ totalDebt: customers.totalDebt })
          .from(customers)
          .where(eq(customers.id, customer.id))
          .limit(1)
        const previousBalance = custRow?.totalDebt ?? 0
        const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
        await db.insert(debtLedger).values({
          tenantId: tenant.id,
          customerId: customer.id,
          amount: amountOwed,
          type: 'invoice_created',
          referenceType: 'invoice',
          referenceId: null,
          notes: `Invoice INV-${tenant.slug.toUpperCase().slice(0, 3)}-${String(j + 1).padStart(4, '0')} \u2014 paid ${amountPaid} of ${total}`,
          balanceAfter: newBalance,
          createdBy: owner.id,
          createdAt,
        })
        await db.update(customers).set({
          totalDebt: newBalance,
          firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${createdAt})`,
          lastDebtActivityAt: createdAt,
        }).where(eq(customers.id, customer.id))
      }
    }
  }

  console.log('Seeding partial debt payments (simulating customers paying down)...')
  let totalDebtPayments = 0
  for (const tenant of tenantRecords) {
    const tenantDebtors = await db
      .select({ id: customers.id, name: customers.name, totalDebt: customers.totalDebt })
      .from(customers)
      .where(sql`${customers.tenantId} = ${tenant.id} AND ${customers.totalDebt} > 0`)
    for (const c of tenantDebtors) {
      // Each debtor has 1-3 historical debt payments they made
      const numPayments = faker.number.int({ min: 1, max: 3 })
      let running = c.totalDebt
      for (let k = 0; k < numPayments; k++) {
        if (running <= 0) break
        // Pay between 10% and 60% of remaining balance (or all of it for small balances)
        const payRatio = running < 50
          ? 1
          : faker.number.float({ min: 0.1, max: 0.6, fractionDigits: 2 })
        const payAmount = Math.round(running * payRatio * 100) / 100
        const previousBalance = running
        running = Math.round((running - payAmount) * 100) / 100
        const ts = faker.date.between({
          from: new Date('2025-03-01'),
          to: new Date(),
        }).toISOString()
        await db.insert(debtLedger).values({
          tenantId: tenant.id,
          customerId: c.id,
          amount: -payAmount,
          type: 'manual_payment',
          referenceType: null,
          referenceId: null,
          notes: faker.helpers.arrayElement([
            'Cash payment',
            'Mobile Money transfer',
            'Bank transfer',
            'Partial settlement',
          ]),
          balanceAfter: running,
          createdBy: ownerRecords.find((o) => o.tenantId === tenant.id)?.id ?? 0,
          createdAt: ts,
        })
        await db.update(customers)
          .set({ totalDebt: running, lastDebtActivityAt: ts })
          .where(eq(customers.id, c.id))
        totalDebtPayments++
        // Stop early once the most recent payment reduced balance close to zero
        if (running < 0.01) break
        // The next payment we record is smaller because the balance dropped
        // (variables closure: running already reflects this)
        void previousBalance
      }
    }
  }

  console.log('Seeding audit logs...')
  const seedIps = ['102.176.45.10', '154.161.12.99', '197.251.224.15', '105.112.74.20']
  const seedUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'IndFlow/1.0 (Android; Mobile; POS-Terminal)',
  ]
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
        // Populate IP / user-agent for the first entry in each tenant
        // so the schema's new columns are exercised by the seed.
        ip: j === 0 ? faker.helpers.arrayElement(seedIps) : null,
        userAgent: j === 0 ? faker.helpers.arrayElement(seedUserAgents) : null,
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
  console.log(`  Debt Payments: ${totalDebtPayments}`)
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
