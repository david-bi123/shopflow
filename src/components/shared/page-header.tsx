import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-3xl bg-[radial-gradient(800px_circle_at_0%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)] opacity-70"
        aria-hidden="true"
      />
      <div className="relative w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-primary to-primary/60" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
            )}
          </div>
        </div>
      </div>

      {children && (
        <div className="relative flex shrink-0 items-center gap-2 sm:justify-end">{children}</div>
      )}
    </div>
  )
}
