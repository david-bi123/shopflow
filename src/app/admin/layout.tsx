'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Store,
  BarChart3,
  Megaphone,
  LogOut,
  Shield,
  Loader2,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Shops', href: '/admin/shops', icon: Store },
  { label: 'Statistics', href: '/admin/stats', icon: BarChart3 },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'super_admin') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session?.user?.role !== 'super_admin') return null

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r bg-card transition-transform duration-300 md:static md:z-30 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-sm">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Super Admin</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{session?.user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:ml-60">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Platform Management
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <Store className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Shop Dashboard</span>
            </Link>
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
