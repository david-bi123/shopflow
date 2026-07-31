import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-sm font-semibold tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. If you followed a link, the
          resource may have been deleted.
        </p>
        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Home className="h-3.5 w-3.5" />
            Go to dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
