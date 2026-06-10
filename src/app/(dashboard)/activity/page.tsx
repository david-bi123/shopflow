'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format'

interface ActivityEntry {
  id: number
  action: string
  entity: string
  performedByName: string
  createdAt: string
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
      <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No activity found</h3>
            <p className="text-sm text-muted-foreground">
              No activity recorded yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{entry.performedByName}</span>{' '}
                  {entry.action.replace(/\./g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.entity} · {formatDate(entry.createdAt, 'datetime')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
