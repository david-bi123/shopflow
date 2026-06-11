'use client'

import { motion } from 'framer-motion'

import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useUIStore } from '@/lib/store/ui-store'
import type { Role } from '@/types'

import { Navbar } from './navbar'
import { Sidebar } from './sidebar'

export interface AppShellUser {
  id: string
  name: string | null
  email: string | null
  role: Role
  tenantId: string | null
}

interface AppShellProps {
  user: AppShellUser
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isCollapsed = useUIStore((state) => state.isCollapsed)

  return (
    <div className="relative flex min-h-screen">
      <Sidebar user={user} />
      <motion.div
        animate={{
          marginLeft: isMobile ? 0 : isCollapsed ? 64 : 256,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative flex flex-1 flex-col"
      >
        <Navbar user={user} />
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 -z-10 bg-background bg-[radial-gradient(900px_circle_at_10%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%),radial-gradient(700px_circle_at_90%_10%,color-mix(in_oklab,var(--chart-2)_14%,transparent),transparent_55%),radial-gradient(600px_circle_at_20%_90%,color-mix(in_oklab,var(--chart-1)_10%,transparent),transparent_55%)] opacity-60" />
          <div className="mx-auto w-full max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </motion.div>
    </div>
  )
}
