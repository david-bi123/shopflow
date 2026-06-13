import { mysqlTable, text, varchar, int, double, json, tinyint, uniqueIndex, index } from 'drizzle-orm/mysql-core'


export const tenants = mysqlTable('tenants', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  subscriptionStatus: varchar('subscription_status', { length: 20 }).notNull().default('trial'),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('tenant_slug_idx').on(table.slug),
  index('tenant_status_idx').on(table.status),
])

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  permissions: json('permissions').$type<string[]>(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastLogin: text('last_login'),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('user_email_idx').on(table.email),
  index('user_tenant_role_idx').on(table.tenantId, table.role),
])

export const customers = mysqlTable('customers', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  totalSales: int('total_sales').notNull().default(0),
  totalRevenue: double('total_revenue').notNull().default(0),
  /** Cached current outstanding debt. Always derived from debt_ledger but
   *  kept here for fast list-page reads. */
  totalDebt: double('total_debt').notNull().default(0),
  /** Timestamp of the first time this customer became a debtor. */
  firstDebtAt: varchar('first_debt_at', { length: 50 }),
  /** Last time the debt changed (creation or payment). */
  lastDebtActivityAt: varchar('last_debt_activity_at', { length: 50 }),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
  /** Soft-delete tombstone. NULL = active. Non-null = anonymized + hidden. */
  deletedAt: varchar('deleted_at', { length: 50 }),
}, (table) => [
  index('customer_tenant_name_idx').on(table.tenantId, table.name),
  index('customer_tenant_phone_idx').on(table.tenantId, table.phone),
  index('customer_tenant_email_idx').on(table.tenantId, table.email),
  index('customer_tenant_debt_idx').on(table.tenantId, table.totalDebt),
  index('customer_tenant_deleted_idx').on(table.tenantId, table.deletedAt),
])

/**
 * Tax line item: a single tax applied to a sale/invoice (e.g. NHIS 2.5%, VAT 15%, GET Fund 2.5%).
 * The `amount` is precomputed at creation time and stored so historical
 * receipts are immutable.
 */
export interface TaxItem {
  name: string
  /** Rate as a percentage, e.g. 15 for 15% VAT. */
  rate: number
  amount: number
}

export const sales = mysqlTable('sales', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  saleNumber: varchar('sale_number', { length: 50 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerId: int('customer_id').references(() => customers.id),
  items: json('items').$type<Array<{ name: string; quantity: number; price: number; subtotal: number }>>().notNull(),
  subtotal: double('subtotal').notNull(),
  /** Discount as a percentage of the subtotal, e.g. 10 for 10%. */
  discountPercent: double('discount_percent').notNull().default(0),
  /** Absolute discount amount in the tenant's currency. Recomputed at creation. */
  discount: double('discount').notNull().default(0),
  /** Total of all tax lines combined. The individual lines are in `taxItems`. */
  tax: double('tax').notNull().default(0),
  /** Itemised taxes (NHIS, VAT, GET Fund, etc.) for line-by-line rendering. */
  taxItems: json('tax_items').$type<TaxItem[]>().notNull().default([]),
  total: double('total').notNull(),
  /** Amount paid at sale time. Defaults to total (paid in full). */
  amountPaid: double('amount_paid').notNull().default(0),
  /** Outstanding amount owed (total - amountPaid). Always 0 if paid in full. */
  amountOwed: double('amount_owed').notNull().default(0),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  notes: text('notes'),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('sale_tenant_number_idx').on(table.tenantId, table.saleNumber),
  index('sale_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('sale_tenant_customer_idx').on(table.tenantId, table.customerId),
  index('sale_tenant_owed_idx').on(table.tenantId, table.amountOwed),
])

export const invoices = mysqlTable('invoices', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  customerId: int('customer_id').references(() => customers.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerAddress: text('customer_address'),
  items: json('items').$type<Array<{ name: string; description?: string; quantity: number; price: number; total: number }>>().notNull(),
  subtotal: double('subtotal').notNull(),
  discountPercent: double('discount_percent').notNull().default(0),
  discount: double('discount').notNull().default(0),
  tax: double('tax').notNull().default(0),
  taxItems: json('tax_items').$type<TaxItem[]>().notNull().default([]),
  total: double('total').notNull(),
  /** Amount paid at invoice time. Defaults to total. */
  amountPaid: double('amount_paid').notNull().default(0),
  /** Outstanding amount owed on this invoice. */
  amountOwed: double('amount_owed').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  dueDate: varchar('due_date', { length: 50 }).notNull(),
  notes: text('notes'),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('invoice_tenant_number_idx').on(table.tenantId, table.invoiceNumber),
  index('invoice_tenant_status_idx').on(table.tenantId, table.status),
  index('invoice_tenant_customer_idx').on(table.tenantId, table.customerId),
  index('invoice_tenant_due_idx').on(table.tenantId, table.dueDate),
  index('invoice_tenant_owed_idx').on(table.tenantId, table.amountOwed),
])

/**
 * Immutable, append-only ledger of every event that changes a customer's
 * outstanding debt. The running balance at any point in time is the
 * algebraic sum of all entries for that customer.
 *
 * Positive `amount` = the customer owes us more (sale/invoice created
 * with partial payment, or a manual interest charge).
 * Negative `amount` = the customer paid some toward their debt.
 *
 * The `customers.totalDebt` column is a cached running balance for fast
 * list-page reads; it must be kept in sync inside a transaction.
 */
export const debtLedger = mysqlTable('debt_ledger', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  customerId: int('customer_id').notNull().references(() => customers.id),
  /** Signed amount. +ve = debt increased, -ve = debt reduced. */
  amount: double('amount').notNull(),
  /**
   * What kind of event this is:
   *  - sale_created / invoice_created: debt was created from a partial
   *    payment. `referenceType` + `referenceId` point at the source row.
   *  - manual_payment: cash paid in by the customer (no source).
   *  - sale_voided / invoice_voided: the original sale/invoice was
   *    deleted so the debt it created is reversed.
   */
  type: varchar('type', { length: 30 }).notNull(),
  referenceType: varchar('reference_type', { length: 20 }),
  referenceId: int('reference_id'),
  notes: text('notes'),
  /** Balance after this entry was applied — denormalised for fast history rendering. */
  balanceAfter: double('balance_after').notNull().default(0),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
}, (table) => [
  index('debt_tenant_customer_created_idx').on(table.tenantId, table.customerId, table.createdAt),
  index('debt_tenant_customer_idx').on(table.tenantId, table.customerId),
  index('debt_tenant_reference_idx').on(table.tenantId, table.referenceType, table.referenceId),
])

export const counters = mysqlTable('counters', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  sequence: int('sequence').notNull().default(0),
}, (table) => [
  uniqueIndex('counter_tenant_name_idx').on(table.tenantId, table.name),
])

export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  userId: int('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: tinyint('read').notNull().default(0),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
}, (table) => [
  index('notif_tenant_user_read_idx').on(table.tenantId, table.userId, table.read),
  index('notif_tenant_created_idx').on(table.tenantId, table.createdAt),
])

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  action: varchar('action', { length: 100 }).notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  performedBy: int('performed_by').notNull().references(() => users.id),
  performedByName: text('performed_by_name').notNull(),
  details: json('details').$type<Record<string, unknown>>(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
}, (table) => [
  index('audit_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('audit_tenant_action_idx').on(table.tenantId, table.action),
  index('audit_tenant_user_idx').on(table.tenantId, table.performedBy),
])

/**
 * A single tax definition that the shop enables by default. e.g.
 *   { name: 'VAT', rate: 15 }
 *   { name: 'NHIS', rate: 2.5 }
 *   { name: 'GET Fund', rate: 2.5 }
 * The `enabled` flag lets the shop opt in or out per-transaction.
 */
export interface TaxDefinition {
  name: string
  rate: number
  enabled: boolean
}

export const settings = mysqlTable('settings', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().unique().references(() => tenants.id),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  storePhone: varchar('store_phone', { length: 50 }),
  storeEmail: varchar('store_email', { length: 255 }),
  storeAddress: text('store_address'),
  /** Short blurb shown on receipts/invoices under the company name. */
  storeDescription: text('store_description'),
  /** Government-issued tax / business registration number, shown on invoices. */
  taxNumber: varchar('tax_number', { length: 100 }),
  logo: varchar('logo', { length: 500 }),
  currency: varchar('currency', { length: 10 }).notNull().default('GHS'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  /** Default overall tax rate (kept for legacy use; new taxes come from `taxes`). */
  taxRate: double('tax_rate').notNull().default(0),
  /** Shop-defined tax lines that the user can enable/disable per transaction. */
  taxes: json('taxes').$type<TaxDefinition[]>().notNull().default([]),
  receiptFooter: text('receipt_footer').notNull(),
  defaultPaymentMethods: json('default_payment_methods').$type<string[]>().notNull(),
  showLogoOnReceipt: tinyint('show_logo_on_receipt').notNull().default(1),
  showQrOnReceipt: tinyint('show_qr_on_receipt').notNull().default(1),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
})

export const subscriptions = mysqlTable('subscriptions', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().unique().references(() => tenants.id),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('trial'),
  trialEndsAt: varchar('trial_ends_at', { length: 50 }),
  currentPeriodStart: varchar('current_period_start', { length: 50 }).notNull(),
  currentPeriodEnd: varchar('current_period_end', { length: 50 }),
  cancelledAt: varchar('cancelled_at', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
})

export const announcements = mysqlTable('announcements', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  active: tinyint('active').notNull().default(1),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  index('announcement_active_created_idx').on(table.active, table.createdAt),
])

/**
 * One-time, single-use tokens for the forgot-password flow. The token is
 * a 32-byte URL-safe random string; the row's `usedAt` and `expiresAt`
 * columns make the token un-replayable. The token is NOT HMAC-signed
 * because it's not a public-facing identifier — the lookup is by random
 * token, which is already 256 bits of entropy.
 */
export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: varchar('expires_at', { length: 50 }).notNull(),
  usedAt: varchar('used_at', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('password_reset_token_hash_idx').on(table.tokenHash),
  index('password_reset_user_idx').on(table.userId),
  index('password_reset_expires_idx').on(table.expiresAt),
])
