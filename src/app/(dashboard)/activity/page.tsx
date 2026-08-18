'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ShoppingCart,
  FileText,
  UserCog,
  Settings,
  UserPlus,
  Trash2,
  Receipt,
  LogIn,
  History,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

interface ActivityEntry {
  id: number
  action: string
  entity: string
  performedByName: string
  createdAt: string
}

const entityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  sale: { icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  invoice: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
  staff: { icon: UserCog, color: 'text-amber-600', bg: 'bg-amber-100' },
  customer: { icon: UserPlus, color: 'text-violet-600', bg: 'bg-violet-100' },
  settings: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  payment: { icon: Receipt, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  auth: { icon: LogIn, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  delete: { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-100' },
}

function getEntityConfig(entity: string) {
  const lower = entity.toLowerCase()
  for (const [key, config] of Object.entries(entityConfig)) {
    if (lower.includes(key)) return config
  }
  return { icon: History, color: 'text-muted-foreground', bg: 'bg-muted' }
}

function groupByDate(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = formatDate(date)
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  return groups
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const { getActivities } = await import('@/lib/actions/report-actions')
        const result = await getActivities()
        if (result.error) {
          setError(result.error)
        } else {
          const activities = result.activities as ActivityEntry[]
          setActivities(activities)
        }
      } catch {
        setError('Failed to load activity')
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
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
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Activity Log</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Track all actions performed in your shop.
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

  const grouped = groupByDate(activities)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-chart-2/5 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Activity Log</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Track all actions performed in your shop.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-20 shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No activity found</h3>
          <p className="text-sm text-muted-foreground">
            No activity recorded yet
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="space-y-2">
                {entries.map((entry, idx) => {
                  const { icon: EntityIcon, color, bg } = getEntityConfig(entry.entity)
                  const isLast = idx === entries.length - 1
                  return (
                    <div key={entry.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-background', bg)}>
                          <EntityIcon className={cn('h-4 w-4', color)} />
                        </div>
                        {!isLast && <div className="mt-1 w-px flex-1 bg-border/40" />}
                      </div>
                      <div className={cn('flex-1 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-colors hover:bg-accent/50', isLast ? 'mb-0' : 'mb-1')}>
                        <p className="text-sm">
                          <span className="font-semibold">{entry.performedByName}</span>{' '}
                          <span className="text-muted-foreground">{entry.action.replace(/\./g, ' ')}</span>
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium">
                            {entry.entity}
                          </span>
                          <span>{formatDate(entry.createdAt, 'datetime')}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
