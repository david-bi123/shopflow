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
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20">
            <Icon className="size-6 text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="mt-2">
          <Button
            asChild={!!action.href}
            onClick={action.onClick}
            className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {action.href ? <a href={action.href}>{action.label}</a> : action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
