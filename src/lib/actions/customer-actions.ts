'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { customers, sales, invoices } from '@/lib/db/schema'
import { eq, and, or, like, desc, count, isNotNull, ne } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validations/customer'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { actionHandler } from '@/lib/utils/action-handler'
import { actionOk } from '@/lib/utils/action-result'
import type { CreateCustomerInput } from '@/lib/validations/customer'

function isDuplicateEmailError(err: unknown): boolean {
  // MySQL duplicate-key error code is 1062; the message contains
  // "Duplicate entry" too. Match either.
  const msg = err instanceof Error ? err.message : String(err)
  return /duplicate entry/i.test(msg) || /errno\s*=\s*1062/i.test(msg) || (err as { code?: string })?.code === 'ER_DUP_ENTRY'
}

export async function createCustomer(data: CreateCustomerInput) {
  return actionHandler('createCustomer', { data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.customers.create)) return { error: 'Forbidden' }

    const validated = createCustomerSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

    const db = await dbConnect()
    const tenantId = toNum(session.user.tenantId!)
    const trimmedEmail = validated.data.email?.trim() || null

    // If an email was supplied, refuse to create a duplicate within the
    // same tenant. We also catch the DB error as a backstop in case a
    // race wins between the SELECT and the INSERT.
    if (trimmedEmail) {
      const [existing] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.email, trimmedEmail)))
        .limit(1)
      if (existing) {
        return { error: 'A customer with this email already exists' }
      }
    }

    try {
      const result = await db.insert(customers).values({
        tenantId,
        ...validated.data,
        email: trimmedEmail,
        createdBy: toNum(session.user.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      const [customer] = await db.select().from(customers).where(eq(customers.id, result[0].insertId))

      revalidatePath('/customers')
      return actionOk(serializeRow(customer))
    } catch (err) {
      if (isDuplicateEmailError(err)) {
        return { error: 'A customer with this email already exists' }
      }
      throw err
    }
  })
}

export async function getCustomers(page = 1, limit = 20, search?: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)
  const conditions = [eq(customers.tenantId, tenantId)]

  if (search) {
    const trimmed = search.trim()
    if (trimmed.length > 0) {
      // For email, only match non-null rows so the LIKE doesn't
      // accidentally match every customer with a blank email.
      const searchCondition = or(
        like(customers.name, `%${trimmed}%`),
        like(customers.phone, `%${trimmed}%`),
        and(isNotNull(customers.email), like(customers.email, `%${trimmed}%`)),
      )
      if (searchCondition) conditions.push(searchCondition)
    }
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
  const tenantId = toNum(session.user.tenantId!)
  const customerId = toNum(id)

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1)

  if (!customer) return { error: 'Customer not found' }

  // Keep the recent-activity list bounded so a customer with thousands
  // of sales doesn't trigger a slow query.
  const [recentSalesResult, recentInvoicesResult] = await Promise.all([
    db.select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      total: sales.total,
      status: sales.paymentMethod,
      createdAt: sales.createdAt,
    }).from(sales)
      .where(and(eq(sales.tenantId, tenantId), eq(sales.customerId, customerId)))
      .orderBy(desc(sales.createdAt))
      .limit(10),
    db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    }).from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.customerId, customerId)))
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
  return actionHandler('updateCustomer', { id, data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.customers.update)) return { error: 'Forbidden' }

    const validated = updateCustomerSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

    const db = await dbConnect()
    const tenantId = toNum(session.user.tenantId!)
    const customerId = toNum(id)

    // If updating the email, ensure it doesn't collide with another
    // customer in the same tenant.
    if (validated.data.email && validated.data.email.trim().length > 0) {
      const trimmed = validated.data.email.trim()
      const [conflict] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.tenantId, tenantId),
          eq(customers.email, trimmed),
          ne(customers.id, customerId),
        ))
        .limit(1)
      if (conflict) {
        return { error: 'Another customer already uses this email' }
      }
      validated.data.email = trimmed
    }

    try {
      await db.update(customers).set({
        ...validated.data,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      const [customer] = await db.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))

      if (!customer) return { error: 'Customer not found' }

      revalidatePath('/customers')
      return actionOk(serializeRow(customer))
    } catch (err) {
      if (isDuplicateEmailError(err)) {
        return { error: 'Another customer already uses this email' }
      }
      throw err
    }
  })
}

export async function deleteCustomer(id: string) {
  return actionHandler('deleteCustomer', { id }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.customers.delete)) return { error: 'Forbidden' }

    const db = await dbConnect()
    const tenantId = toNum(session.user.tenantId!)
    const customerId = toNum(id)

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))

    if (!customer) return { error: 'Customer not found' }

    await db.delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))

    revalidatePath('/customers')
    return actionOk({})
  })
}
