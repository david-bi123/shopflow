import type { Role } from '@/types'

export const PERMISSIONS = {
  sales: {
    create: 'sales.create',
    read: 'sales.read',
    update: 'sales.update',
    delete: 'sales.delete',
  },
  invoices: {
    create: 'invoices.create',
    read: 'invoices.read',
    update: 'invoices.update',
    delete: 'invoices.delete',
  },
  customers: {
    create: 'customers.create',
    read: 'customers.read',
    update: 'customers.update',
    delete: 'customers.delete',
  },
  staff: {
    create: 'staff.create',
    read: 'staff.read',
    update: 'staff.update',
    delete: 'staff.delete',
  },
  reports: {
    read: 'reports.read',
    export: 'reports.export',
  },
  settings: {
    read: 'settings.read',
    update: 'settings.update',
  },
  activity: {
    read: 'activity.read',
  },
} as const

export type PermissionValue = string

const ROLE_PERMISSIONS: Record<Role, PermissionValue[]> = {
  super_admin: Object.values(PERMISSIONS).flatMap((group) =>
    Object.values(group)
  ) as PermissionValue[],
  owner: Object.values(PERMISSIONS).flatMap((group) =>
    Object.values(group)
  ) as PermissionValue[],
  admin: [
    PERMISSIONS.sales.create,
    PERMISSIONS.sales.read,
    PERMISSIONS.sales.update,
    PERMISSIONS.sales.delete,
    PERMISSIONS.invoices.create,
    PERMISSIONS.invoices.read,
    PERMISSIONS.invoices.update,
    PERMISSIONS.invoices.delete,
    PERMISSIONS.customers.create,
    PERMISSIONS.customers.read,
    PERMISSIONS.customers.update,
    PERMISSIONS.customers.delete,
    PERMISSIONS.reports.read,
  ],
  staff: [
    PERMISSIONS.sales.create,
    PERMISSIONS.sales.read,
    PERMISSIONS.invoices.create,
    PERMISSIONS.invoices.read,
    PERMISSIONS.customers.create,
    PERMISSIONS.customers.read,
  ],
}

export function hasPermission(
  role: Role,
  requiredPermission: PermissionValue,
  extraPermissions?: string[]
): boolean {
  if (role === 'super_admin') return true
  const rolePerms = ROLE_PERMISSIONS[role] || []
  return rolePerms.includes(requiredPermission) || (extraPermissions?.includes(requiredPermission) ?? false)
}

export function getRolePermissions(role: Role): PermissionValue[] {
  return ROLE_PERMISSIONS[role] || []
}
