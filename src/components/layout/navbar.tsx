"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Store,
  User,
} from "lucide-react"

import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { useUIStore } from "@/lib/store/ui-store"
import { cn } from "@/lib/utils/cn"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface NavbarProps {
  title?: string
}

export function Navbar({ title }: NavbarProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)

  const user = session?.user

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Store className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">ShopFlow</span>
      </div>

      {/* Page title / breadcrumb */}
      <div className="flex-1">
        {title && (
          <h1 className="text-sm font-medium text-foreground md:text-base">
            {title}
          </h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Global Search */}
        <Button variant="ghost" size="icon" asChild className="hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring">
          <Link href="/dashboard/search">
            <Search className="h-5 w-5" />
          </Link>
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring"
          asChild
        >
          <Link href="/dashboard/notifications">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px] shadow-sm"
            >
              3
            </Badge>
          </Link>
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-2"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-tight">
                    {user?.name ?? "User"}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {user?.email ?? ""}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name ?? "User"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
