'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Store,
  UserCog,
  Users,
  Loader2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { hasPermission, PERMISSIONS, type PermissionValue } from '@/lib/auth/roles'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useUIStore } from '@/lib/store/ui-store'
import { cn } from '@/lib/utils/cn'
import { logoutAction } from '@/lib/actions/auth-actions'
import type { Role } from '@/types'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface SidebarUser {
  id: string
  name: string | null
  email: string | null
  role: Role
  tenantId: string | null
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  permission?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sales', href: '/sales', icon: Receipt },
  { label: 'Customers', href: '/customers', icon: Users },
  {
    label: 'Staff',
    href: '/staff',
    icon: UserCog,
    permission: PERMISSIONS.staff.read,
  },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Activity', href: '/activity', icon: Activity },
]

function SidebarContent({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const isCollapsed = useUIStore((state) => state.isCollapsed)
  const toggleCollapse = useUIStore((state) => state.toggleCollapse)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logoutAction()
      window.location.href = '/'
    } catch {
      setSigningOut(false)
    }
  }

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true
    return hasPermission(user.role, item.permission as PermissionValue)
  })

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-background',
        isMobile && 'w-full',
        !isMobile && isCollapsed && 'w-16 items-center'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2 border-b px-4',
          isCollapsed && !isMobile && 'justify-center px-2'
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
          <Store className="h-4 w-4 text-primary" />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {(!isCollapsed || isMobile) && (
            <motion.span
              key="logo-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="text-lg font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text"
            >
              IndFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  !isActive && 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                  isActive &&
                    'bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary shadow-sm ring-1 ring-inset ring-primary/20',
                  isCollapsed && !isMobile && 'justify-center px-2'
                )}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-primary/70 shadow-sm shadow-primary/30',
                      isCollapsed && !isMobile ? 'h-5 w-[3px]' : 'h-6 w-1'
                    )}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-all duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
                  )}
                />
                <AnimatePresence mode="wait" initial={false}>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      key={item.label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {!isMobile && (
        <div className="border-t px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className={cn('hover:bg-accent/50 transition-all', isCollapsed ? 'mx-auto' : 'w-full')}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      )}

      <Separator />
      <div
        className={cn(
          'flex items-center gap-3 p-3',
          isCollapsed && !isMobile && 'flex-col'
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border/50 ring-offset-1">
          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
            {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <AnimatePresence mode="wait" initial={false}>
          {(!isCollapsed || isMobile) && (
            <motion.div
              key="user-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 overflow-hidden"
            >
              <p className="truncate text-sm font-medium">{user.name ?? 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email ?? ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out"
          aria-label="Sign out"
          className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

interface SidebarProps {
  user: SidebarUser
}

export function Sidebar({ user }: SidebarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const isCollapsed = useUIStore((state) => state.isCollapsed)

  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed left-3 top-3 z-40 md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent user={user} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-30 h-full overflow-hidden border-r bg-background shadow-sm"
    >
      <SidebarContent user={user} />
    </motion.aside>
  )
}
