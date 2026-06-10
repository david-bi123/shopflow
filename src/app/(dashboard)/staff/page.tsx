'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  UserCog,
  ShieldCheck,
  ShieldOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils/format'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  createdAt: string
}

const PAGE_SIZE = 10

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' })

  useEffect(() => {
    async function fetchStaff() {
      try {
        const { getStaff } = await import('@/lib/actions/staff-actions')
        const data = await getStaff()
        if ('error' in data) { setError(data.error ?? 'Failed to load staff'); return }
        setStaff(data.staff as unknown as StaffMember[])
      } catch {
        setError('Failed to load staff')
      } finally {
        setLoading(false)
      }
    }
    fetchStaff()
  }, [])

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    setInviting(true)
    setTempPassword(null)
    try {
      const { inviteStaff } = await import('@/lib/actions/staff-actions')
      const result = await inviteStaff({
        name: form.name,
        email: form.email,
        role: form.role as 'admin' | 'staff',
      })
      const res = result as { tempPassword?: string }
      if (res.tempPassword) {
        setTempPassword(res.tempPassword)
      }
      toast.success('Staff member invited')
      setForm({ name: '', email: '', role: 'staff' })
      const { getStaff } = await import('@/lib/actions/staff-actions')
      const data = await getStaff()
      if (!('error' in data)) setStaff(data.staff as unknown as StaffMember[])
    } catch {
      toast.error('Failed to invite staff')
    } finally {
      setInviting(false)
    }
  }

  async function handleToggleStatus(member: StaffMember) {
    try {
      const { updateStaff } = await import('@/lib/actions/staff-actions')
      const newStatus = member.status === 'active' ? 'suspended' : 'active'
      await updateStaff(member.id, { status: newStatus })
      toast.success(`Staff ${newStatus === 'active' ? 'activated' : 'suspended'}`)
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, status: newStatus } : s))
      )
    } catch {
      toast.error('Failed to update staff status')
    }
  }

  async function handleUpdateRole(member: StaffMember, newRole: string) {
    try {
      const { updateStaff } = await import('@/lib/actions/staff-actions')
      await updateStaff(member.id, { role: newRole })
      toast.success('Role updated')
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, role: newRole } : s))
      )
    } catch {
      toast.error('Failed to update role')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this staff member?')) return
    try {
      const { deleteStaff } = await import('@/lib/actions/staff-actions')
      await deleteStaff(id)
      toast.success('Staff removed')
      setStaff((prev) => prev.filter((s) => s.id !== id))
    } catch {
      toast.error('Failed to remove staff')
    }
  }

  function handleCopyPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open)
            if (!open) setTempPassword(null)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Staff Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your shop
              </DialogDescription>
            </DialogHeader>
            {tempPassword ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="mb-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Staff member created successfully!
                  </p>
                  <p className="mb-1 text-sm text-emerald-700 dark:text-emerald-300">
                    Temporary password:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border bg-background px-2 py-1 text-sm font-mono">
                      {tempPassword}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    Share this password securely with the new staff member. They will be asked to
                    change it on first login.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => setInviteOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Name *</Label>
                    <Input
                      id="invite-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="staff@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={inviting}>
                    {inviting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Invite
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <UserCog className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No staff found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {search ? 'Try a different search term' : 'Invite your first staff member'}
            </p>
            {!search && (
              <Button onClick={() => setInviteOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Invite Staff
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.status === 'active'
                            ? 'default'
                            : member.status === 'suspended'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.lastLogin ? formatDate(member.lastLogin) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleUpdateRole(member, v)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(member)}
                          title={member.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          {member.status === 'active' ? (
                            <ShieldOff className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
