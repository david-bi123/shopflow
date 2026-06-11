import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="relative">
        {Icon && (
          <div className="relative flex size-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-primary/15 to-transparent ring-1 ring-inset ring-primary/20" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />
            <Icon className="relative size-6 text-primary drop-sm" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="mt-1">
          <Button
            asChild={!!action.href}
            onClick={action.onClick}
            className="h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-5 font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-95 transition-all duration-150"
          >
            {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
