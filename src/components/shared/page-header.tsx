import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="relative mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div
        className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-3xl bg-[radial-gradient(800px_circle_at_0%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)] opacity-70"
        aria-hidden="true"
      />
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 sm:h-10 sm:w-10">
            <div className="h-4 w-4 rounded bg-gradient-to-br from-primary to-primary/60 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="truncate text-xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent sm:text-2xl md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm sm:text-base">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {children && (
        <div className="relative flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          {children}
        </div>
      )}
    </div>
  )
}
