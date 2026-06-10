import { mysqlTable, text, varchar, int, double, json, tinyint, uniqueIndex, index } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

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
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  index('customer_tenant_name_idx').on(table.tenantId, table.name),
  index('customer_tenant_phone_idx').on(table.tenantId, table.phone),
  index('customer_tenant_email_idx').on(table.tenantId, table.email),
])

export const sales = mysqlTable('sales', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  saleNumber: varchar('sale_number', { length: 50 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerId: int('customer_id').references(() => customers.id),
  items: json('items').$type<Array<{ name: string; quantity: number; price: number; subtotal: number; productId?: number }>>().notNull(),
  subtotal: double('subtotal').notNull(),
  discount: double('discount').notNull().default(0),
  tax: double('tax').notNull().default(0),
  total: double('total').notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  notes: text('notes'),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  uniqueIndex('sale_tenant_number_idx').on(table.tenantId, table.saleNumber),
  index('sale_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('sale_tenant_customer_idx').on(table.tenantId, table.customerId),
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
  discount: double('discount').notNull().default(0),
  tax: double('tax').notNull().default(0),
  total: double('total').notNull(),
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

export const settings = mysqlTable('settings', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().unique().references(() => tenants.id),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  storePhone: varchar('store_phone', { length: 50 }),
  storeEmail: varchar('store_email', { length: 255 }),
  storeAddress: text('store_address'),
  logo: varchar('logo', { length: 500 }),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  taxRate: double('tax_rate').notNull().default(0),
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

export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoincrement(),
  tenantId: int('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  description: text('description'),
  price: double('price').notNull().default(0),
  costPrice: double('cost_price').notNull().default(0),
  stockQuantity: int('stock_quantity').notNull().default(0),
  lowStockThreshold: int('low_stock_threshold').notNull().default(10),
  category: varchar('category', { length: 100 }),
  unit: varchar('unit', { length: 50 }).default('pcs'),
  barcode: varchar('barcode', { length: 100 }),
  imageUrl: varchar('image_url', { length: 500 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull(),
  updatedAt: varchar('updated_at', { length: 50 }).notNull(),
}, (table) => [
  index('product_tenant_name_idx').on(table.tenantId, table.name),
  uniqueIndex('product_tenant_sku_idx').on(table.tenantId, table.sku),
  index('product_tenant_category_idx').on(table.tenantId, table.category),
])

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
