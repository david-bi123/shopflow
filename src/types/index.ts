export type Role = 'super_admin' | 'owner' | 'admin' | 'staff'

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type NotificationType =
  | 'sale.created'
  | 'sale.deleted'
  | 'sale.payment_recorded'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'debt.paid'
  | 'debt.incurred'
  | 'staff.invited'
  | 'staff.removed'
  | 'shop.approved'
  | 'shop.rejected'
  | 'shop.suspended'
  | 'announcement'
  | 'low_stock'
