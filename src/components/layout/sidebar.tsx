"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Store,
  UserCog,
  Users,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { hasPermission, PERMISSIONS, type PermissionValue } from "@/lib/auth/roles"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { useUIStore } from "@/lib/store/ui-store"
import { cn } from "@/lib/utils/cn"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  permission?: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Sales", href: "/dashboard/sales", icon: Receipt },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  {
    label: "Staff",
    href: "/dashboard/staff",
    icon: UserCog,
    permission: PERMISSIONS.staff.read,
  },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Activity", href: "/dashboard/activity", icon: Activity },
]

function SidebarContent() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isCollapsed = useUIStore((state) => state.isCollapsed)
  const toggleCollapse = useUIStore((state) => state.toggleCollapse)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const user = session?.user

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true
    if (!user) return false
    return hasPermission(user.role, item.permission as PermissionValue)
  })

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-background",
        isMobile && "w-full",
        !isMobile && isCollapsed && "w-16 items-center"
      )}
    >
      {/* Logo / Shop Name */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b px-4",
          isCollapsed && !isMobile && "justify-center px-2"
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Store className="h-4 w-4 text-primary" />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {(!isCollapsed || isMobile) && (
            <motion.span
              key="logo-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="text-lg font-semibold tracking-tight"
            >
              IndFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  "hover:bg-accent/60 hover:text-accent-foreground",
                  !isActive && "text-muted-foreground",
                  isActive &&
                    "bg-accent/70 text-accent-foreground shadow-sm",
                  isCollapsed && !isMobile && "justify-center px-2"
                )}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-primary",
                      isCollapsed && !isMobile ? "h-4 w-[2px]" : "h-5 w-[3px]"
                    )}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-150",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <div className="border-t px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className={cn(
              "transition-all",
              isCollapsed ? "mx-auto" : "w-full"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      )}

      {/* User Info & Logout */}
      <Separator />
      <div
        className={cn(
          "flex items-center gap-3 p-3",
          isCollapsed && !isMobile && "flex-col"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border">
          <AvatarImage src={user?.image ?? undefined} />
          <AvatarFallback className="text-xs font-medium">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
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
              <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          title="Sign out"
          className="shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const isCollapsed = useUIStore((state) => state.isCollapsed)

  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-3 top-3 z-40 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-30 h-full overflow-hidden border-r bg-background"
    >
      <SidebarContent />
    </motion.aside>
  )
}
