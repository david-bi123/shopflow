export type Role = 'super_admin' | 'owner' | 'admin' | 'staff'

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'rejected'

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

export type SalePaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type NotificationType =
  | 'sale.created'
  | 'sale.deleted'
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
