'use client'

import { useEffect, useState } from 'react'
import {
  Megaphone,
  Plus,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
    fetchAnnouncements()
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
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Announcement</DialogTitle>
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
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between py-4">
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!a.active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Badge variant={priorityColors[a.priority]}>
                    {a.priority}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
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
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.message}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
