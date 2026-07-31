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
  Users,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

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

const ROLE_STYLES: Record<string, { bg: string; label: string; dot: string }> = {
  admin: { bg: 'bg-violet-100', label: 'text-violet-700', dot: 'bg-violet-500' },
  staff: { bg: 'bg-blue-100', label: 'text-blue-700', dot: 'bg-blue-500' },
}

const STATUS_STYLES: Record<string, { bg: string; label: string; dot: string }> = {
  active: { bg: 'bg-emerald-100', label: 'text-emerald-700', dot: 'bg-emerald-500' },
  suspended: { bg: 'bg-amber-100', label: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-slate-100', label: 'text-slate-700', dot: 'bg-slate-400' },
}

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
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetDone, setResetDone] = useState(false)

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

  function openResetDialog(member: StaffMember) {
    setResetTarget(member)
    setResetPassword('')
    setResetConfirm('')
    setResetDone(false)
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    if (!resetPassword.trim() || !resetConfirm.trim()) {
      toast.error('Enter the new password in both fields')
      return
    }
    if (resetPassword !== resetConfirm) {
      toast.error('Passwords do not match')
      return
    }
    setResetting(true)
    try {
      const { resetStaffPassword } = await import('@/lib/actions/staff-actions')
      const result = await resetStaffPassword(resetTarget.id, {
        newPassword: resetPassword,
        confirmPassword: resetConfirm,
      })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      setResetDone(true)
      toast.success('Password reset')
    } catch {
      toast.error('Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Staff</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage your staff team and their permissions.
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
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <UserCog className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Staff</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage your staff team and their permissions.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-10 rounded-full border border-input/60 bg-card pl-10 pr-4 shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-amber-500/20"
          />
        </div>
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open)
            if (!open) setTempPassword(null)
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-10 shrink-0 rounded-full bg-amber-600 text-white shadow-md hover:bg-amber-700">
              <Plus className="mr-1.5 size-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl border-border/60 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-500" />
            {tempPassword ? (
              <div className="space-y-4 pt-2">
                <DialogHeader>
                  <DialogTitle className="text-xl">Staff Invited</DialogTitle>
                  <DialogDescription>Staff member created successfully</DialogDescription>
                </DialogHeader>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/50">
                  <p className="mb-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Temporary password
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-mono dark:border-emerald-700 dark:bg-background">
                      {tempPassword}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyPassword} className="shrink-0 rounded-lg border-emerald-200 dark:border-emerald-700">
                      {copied ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    Share this password securely with the new staff member. They will be asked to change it on first login.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => setInviteOpen(false)} className="rounded-xl bg-amber-600 text-white shadow-md hover:bg-amber-700">
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <DialogHeader className="pt-2">
                  <DialogTitle className="text-xl">Invite Staff Member</DialogTitle>
                  <DialogDescription>Send an invitation to join your shop</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name" className="text-sm font-medium">Name *</Label>
                    <Input
                      id="invite-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full name"
                      className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-amber-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="staff@example.com"
                      className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-amber-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role" className="text-sm font-medium">Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v })}
                    >
                      <SelectTrigger className="rounded-xl border-border/60 focus:ring-2 focus:ring-amber-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl border-border/60 shadow-sm">
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={inviting} className="rounded-xl bg-amber-600 text-white shadow-md hover:bg-amber-700">
                    {inviting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    Invite
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <EmptyState
            icon={Users}
            title={search ? 'No staff found' : 'No staff yet'}
            description={search ? 'Try a different search term' : 'Invite your first staff member'}
            action={!search ? { label: 'Invite Staff', onClick: () => setInviteOpen(true) } : undefined}
          />
        </div>
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Name',
                primaryOnCard: true,
                cell: (m: StaffMember) => <span className="font-medium">{m.name}</span>,
              },
              {
                key: 'email',
                header: 'Email',
                mobileLabel: 'Email',
                hideBelow: 'lg',
                cell: (m: StaffMember) => <span className="text-muted-foreground">{m.email}</span>,
              },
              {
                key: 'role',
                header: 'Role',
                mobileLabel: 'Role',
                cell: (m: StaffMember) => {
                  const roleStyle = ROLE_STYLES[m.role] ?? ROLE_STYLES.staff
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', roleStyle.bg, roleStyle.label)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', roleStyle.dot)} />
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </span>
                  )
                },
              },
              {
                key: 'status',
                header: 'Status',
                mobileLabel: 'Status',
                cell: (m: StaffMember) => {
                  const statusStyle = STATUS_STYLES[m.status] ?? STATUS_STYLES.pending
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyle.bg, statusStyle.label)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  )
                },
              },
              {
                key: 'lastLogin',
                header: 'Last Login',
                mobileLabel: 'Last login',
                hideBelow: 'lg',
                cell: (m: StaffMember) => (
                  <span className="text-muted-foreground">{m.lastLogin ? formatDate(m.lastLogin) : 'Never'}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-44',
                cell: (m: StaffMember) => (
                  <div className="flex items-center gap-1">
                    <Select
                      value={m.role}
                      onValueChange={(v) => handleUpdateRole(m, v)}
                    >
                      <SelectTrigger className="h-8 w-20 rounded-lg border-border/60 text-xs focus:ring-2 focus:ring-amber-500/20">
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
                      onClick={() => handleToggleStatus(m)}
                      title={m.status === 'active' ? 'Suspend' : 'Activate'}
                      className="rounded-full"
                    >
                      {m.status === 'active' ? (
                        <ShieldOff className="size-4 text-amber-500" />
                      ) : (
                        <ShieldCheck className="size-4 text-emerald-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openResetDialog(m)}
                      title="Reset password"
                      className="rounded-full"
                    >
                      <KeyRound className="size-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(m.id)}
                      className="rounded-full"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={(m) => m.id}
            renderCardActions={(m) => (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openResetDialog(m)}
                title="Reset password"
                className="h-9 w-9 rounded-full"
                aria-label="Reset password"
              >
                <KeyRound className="size-4 text-blue-500" />
              </Button>
            )}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-9 rounded-full border-border/60 shadow-sm"
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={cn(
                        'h-9 min-w-[2.25rem] rounded-full px-3',
                        p === page
                          ? 'bg-amber-600 text-white shadow-sm hover:bg-amber-700'
                          : 'border-border/60 shadow-sm'
                      )}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-9 rounded-full border-border/60 shadow-sm"
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null)
            setResetPassword('')
            setResetConfirm('')
            setResetDone(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 to-cyan-500" />
          {resetDone ? (
            <div className="space-y-4 pt-2">
              <DialogHeader>
                <DialogTitle className="text-xl">Password Reset</DialogTitle>
                <DialogDescription>
                  New password set for {resetTarget?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/50">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  The password has been updated. Share it with {resetTarget?.name} — they will be asked to change it on first login.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setResetTarget(null)
                    setResetPassword('')
                    setResetConfirm('')
                    setResetDone(false)
                  }}
                  className="rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader className="pt-2">
                <DialogTitle className="text-xl">Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new password for {resetTarget?.name}. Their current password will stop working.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="text-sm font-medium">New password *</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="At least 8 characters, with upper, lower & number"
                    className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm" className="text-sm font-medium">Confirm password *</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="Re-enter the new password"
                    className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setResetTarget(null)}
                  className="rounded-xl border-border/60 shadow-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleResetPassword()}
                  disabled={resetting}
                  className="rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700"
                >
                  {resetting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
