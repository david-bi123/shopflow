'use client'

import { useEffect, useState } from 'react'
import {
  Megaphone,
  Plus,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/lib/utils/format'

interface Announcement {
  id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  active: boolean
  createdAt: string
}

const priorityColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

const priorityIcons: Record<string, typeof AlertTriangle> = {
  high: AlertTriangle,
  medium: Info,
  low: MessageSquare,
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  async function fetchAnnouncements() {
    try {
      const { getAnnouncements } = await import('@/lib/actions/admin-actions')
      const result = await getAnnouncements()
      setAnnouncements(result as unknown as Announcement[])
    } catch {
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { getAnnouncements } = await import('@/lib/actions/admin-actions')
        const result = await getAnnouncements()
        if (cancelled) return
        setAnnouncements(result as unknown as Announcement[])
      } catch {
        if (!cancelled) setError('Failed to load announcements')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleCreate() {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSubmitting(true)
    try {
      const { createAnnouncement } = await import('@/lib/actions/admin-actions')
      const result = await createAnnouncement({ title: title.trim(), message: message.trim(), priority })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Announcement created')
      setOpen(false)
      setTitle('')
      setMessage('')
      setPriority('medium')
      fetchAnnouncements()
    } catch {
      toast.error('Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      <PageHeader
        title="Announcements"
        description="Manage platform-wide announcements"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Plus className="mr-1 h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                New Announcement
              </DialogTitle>
              <DialogDescription>
                Create an announcement that will be shown to all shops.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Write your announcement..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v: 'low' | 'medium' | 'high') => setPriority(v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Create your first platform-wide announcement"
          action={{ label: 'Create Announcement', onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const PriorityIcon = priorityIcons[a.priority]
            return (
              <Card key={a.id} className="overflow-hidden border-0 bg-card shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      a.priority === 'high'
                        ? 'bg-destructive/10'
                        : a.priority === 'medium'
                          ? 'bg-primary/10'
                          : 'bg-muted'
                    }`}>
                      <PriorityIcon className={`h-4 w-4 ${
                        a.priority === 'high'
                          ? 'text-destructive'
                          : a.priority === 'medium'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="truncate text-base">{a.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="whitespace-nowrap">{formatDate(a.createdAt, 'datetime')}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="capitalize">{a.priority} priority</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={a.active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {a.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={priorityColors[a.priority]} className="hidden text-xs capitalize sm:inline-flex">
                        {a.priority}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      aria-label={expanded === a.id ? 'Collapse' : 'Expand'}
                    >
                      {expanded === a.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {expanded === a.id && (
                  <CardContent className="pb-4 pt-0">
                    <div className={`rounded-lg p-4 sm:ml-12 ${
                      a.priority === 'high'
                        ? 'bg-destructive/5 border border-destructive/10'
                        : a.priority === 'medium'
                          ? 'bg-primary/5 border border-primary/10'
                          : 'bg-muted/50 border border-muted'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {a.message}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
