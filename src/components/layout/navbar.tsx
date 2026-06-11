'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  Store,
} from 'lucide-react'

import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useUIStore } from '@/lib/store/ui-store'
import { logoutAction } from '@/lib/actions/auth-actions'
import type { Role } from '@/types'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

interface NavbarUser {
  id: string
  name: string | null
  email: string | null
  role: Role
  tenantId: string | null
}

interface NavbarProps {
  user: NavbarUser
  title?: string
}

export function Navbar({ user, title }: NavbarProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
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

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center gap-2 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
          <Store className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-sm font-bold tracking-tight">
          IndFlow
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="truncate text-sm font-semibold text-foreground md:text-base">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl">
          <Search className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl"
          asChild
        >
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px] font-bold shadow-sm"
            >
              3
            </Badge>
          </Link>
        </Button>

        <Separator orientation="vertical" className="mx-1.5 h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative flex items-center gap-2 rounded-xl px-2 hover:bg-accent/50">
              <Avatar className="h-7 w-7 ring-1 ring-border/50">
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-tight">
                    {user.name ?? 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {user.email ?? ''}
                  </span>
                </div>
              )}
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border shadow-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-1 ring-border/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name ?? 'User'}</span>
                  <span className="text-xs text-muted-foreground">{user.email ?? ''}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/activity" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="#" className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4" />
                Help & Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
