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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="default">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <BellOff className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {notifications.map((notification, idx) => {
              const Icon = typeIcons[notification.type] ?? Bell
              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent',
                    !notification.read && 'border-l-2 border-l-primary bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full p-2',
                      notification.read ? 'bg-muted' : 'bg-primary/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        notification.read ? 'text-muted-foreground' : 'text-primary'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </p>
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
                >
                  {loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
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
