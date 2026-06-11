'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { customers, sales, invoices } from '@/lib/db/schema'
import { eq, and, or, like, desc, count } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validations/customer'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import type { CreateCustomerInput } from '@/lib/validations/customer'

export async function createCustomer(data: CreateCustomerInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.customers.create)) return { error: 'Forbidden' }

  const validated = createCustomerSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()

  const result = await db.insert(customers).values({
    tenantId: toNum(session.user.tenantId!),
    ...validated.data,
    createdBy: toNum(session.user.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [customer] = await db.select().from(customers).where(eq(customers.id, result[0].insertId))

  revalidatePath('/customers')
  return { success: true, customer: serializeRow(customer) }
}

export async function getCustomers(page = 1, limit = 20, search?: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)
  const conditions = [eq(customers.tenantId, tenantId)]

  if (search) {
    const searchCondition = or(
      like(customers.name, `%${search}%`),
      like(customers.phone, `%${search}%`),
      like(customers.email, `%${search}%`),
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = and(...conditions)

  const [totalResult] = await db.select({ total: count() }).from(customers).where(whereClause)
  const total = totalResult?.total ?? 0

  const result = await db.select().from(customers)
    .where(whereClause)
    .orderBy(desc(customers.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  return {
    customers: serializeList(result),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getCustomerById(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, toNum(id)), eq(customers.tenantId, toNum(session.user.tenantId!))))
    .limit(1)

  if (!customer) return { error: 'Customer not found' }

  const [recentSalesResult, recentInvoicesResult] = await Promise.all([
    db.select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      total: sales.total,
      status: sales.paymentMethod,
      createdAt: sales.createdAt,
    }).from(sales)
      .where(and(eq(sales.tenantId, toNum(session.user.tenantId!)), eq(sales.customerId, toNum(id))))
      .orderBy(desc(sales.createdAt))
      .limit(10),
    db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    }).from(invoices)
      .where(and(eq(invoices.tenantId, toNum(session.user.tenantId!)), eq(invoices.customerId, toNum(id))))
      .orderBy(desc(invoices.createdAt))
      .limit(10),
  ])

  return {
    customer: {
      ...serializeRow(customer),
      recentSales: serializeList(recentSalesResult as unknown as Record<string, unknown>[]),
      recentInvoices: serializeList(recentInvoicesResult as unknown as Record<string, unknown>[]),
    },
  }
}

export async function updateCustomer(id: string, data: Partial<CreateCustomerInput>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.customers.update)) return { error: 'Forbidden' }

  const validated = updateCustomerSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()

  await db.update(customers).set({
    ...validated.data,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(customers.id, toNum(id)), eq(customers.tenantId, toNum(session.user.tenantId!))))
  const [customer] = await db.select().from(customers).where(and(eq(customers.id, toNum(id)), eq(customers.tenantId, toNum(session.user.tenantId!))))

  if (!customer) return { error: 'Customer not found' }

  revalidatePath('/customers')
  return { success: true, customer: serializeRow(customer) }
}

export async function deleteCustomer(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.customers.delete)) return { error: 'Forbidden' }

  const db = await dbConnect()

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, toNum(id)), eq(customers.tenantId, toNum(session.user.tenantId!))))
  await db.delete(customers)
    .where(and(eq(customers.id, toNum(id)), eq(customers.tenantId, toNum(session.user.tenantId!))))

  if (!customer) return { error: 'Customer not found' }

  revalidatePath('/customers')
  return { success: true }
}
