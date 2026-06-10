import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-2xl bg-[radial-gradient(800px_circle_at_0%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)] opacity-70"
        aria-hidden="true"
      />
      <div className="relative w-full flex flex-col gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground sm:text-base">{description}</p>}
        </div>
      </div>

      {children && (
        <div className="relative flex items-center gap-2 sm:justify-end">{children}</div>
      )}
    </div>
  )
}
