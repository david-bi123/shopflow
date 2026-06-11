'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  AlertCircle,
  ShoppingCart,
  FileText,
  UserCog,
  Settings,
  AlertTriangle,
  Info,
  Receipt,
  Store,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

const typeIcons: Record<string, React.ElementType> = {
  sale: ShoppingCart,
  invoice: FileText,
  staff: UserCog,
  settings: Settings,
  warning: AlertTriangle,
  info: Info,
  receipt: Receipt,
  store: Store,
}

const typeColors: Record<string, string> = {
  sale: 'text-emerald-600 bg-emerald-100',
  invoice: 'text-blue-600 bg-blue-100',
  staff: 'text-amber-600 bg-amber-100',
  settings: 'text-gray-600 bg-gray-100',
  warning: 'text-rose-600 bg-rose-100',
  info: 'text-sky-600 bg-sky-100',
  receipt: 'text-cyan-600 bg-cyan-100',
  store: 'text-violet-600 bg-violet-100',
}

const ITEMS_PER_PAGE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    try {
      const { getNotifications } = await import('@/lib/actions/notification-actions')
      const data = await getNotifications(pageNum, ITEMS_PER_PAGE)
      if ('error' in data) throw new Error(data.error)
      const items = (data as unknown as { notifications: Notification[] }).notifications
      if (append) {
        setNotifications((prev) => [...prev, ...items])
      } else {
        setNotifications(items)
      }
      setHasMore(items.length === ITEMS_PER_PAGE)
    } catch {
      throw new Error('Failed to load notifications')
    }
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const { getUnreadCount } = await import('@/lib/actions/notification-actions')
      const count = await getUnreadCount()
      setUnreadCount(count as number)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([fetchNotifications(1), fetchUnread()])
      } catch {
        setError('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchNotifications, fetchUnread])

  async function loadMore() {
    setLoadingMore(true)
    try {
      await fetchNotifications(page + 1, true)
      setPage((p) => p + 1)
    } catch {
      toast.error('Failed to load more notifications')
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      const { markNotificationRead } = await import('@/lib/actions/notification-actions')
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  async function handleMarkAllRead() {
    try {
      const { markAllNotificationsRead } = await import('@/lib/actions/notification-actions')
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  function handleClick(notification: Notification) {
    if (!notification.read) {
      handleMarkRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Notifications</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Stay updated with shop activity and alerts.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="rounded-xl shadow-sm">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Notifications</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Stay updated with shop activity and alerts.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge variant="default" className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="h-9 rounded-full border-border/60 shadow-sm">
            <CheckCheck className="mr-1.5 size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] ?? Bell
              const colorClass = typeColors[notification.type] ?? 'text-muted-foreground bg-muted'
              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    'group relative cursor-pointer rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md',
                    !notification.read
                      ? 'border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent'
                      : 'border-border/60 bg-card'
                  )}
                >
                  {!notification.read && (
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-primary" />
                  )}
                  <div className="flex items-start gap-4 pl-1">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5', colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p
                            className={cn(
                              'text-sm truncate',
                              !notification.read && 'font-semibold'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-10 rounded-full border-border/60 px-8 shadow-sm"
                >
                  {loadingMore && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
