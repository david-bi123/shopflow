'use client'

import { AlertTriangle, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_circle_at_50%_-20%,color-mix(in_oklab,var(--destructive)_12%,transparent),transparent_60%),radial-gradient(600px_circle_at_80%_80%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_55%)]" />
      <Card className="w-full max-w-md overflow-hidden rounded-2xl border shadow-xl shadow-destructive/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-destructive/80 via-destructive to-destructive/80" />
        <CardHeader className="pb-4 pt-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 via-destructive/15 to-transparent ring-1 ring-destructive/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Account Suspended</CardTitle>
          <CardDescription className="mt-2 max-w-sm mx-auto text-sm leading-relaxed">
            Your account has been suspended. Please contact support for more information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/30 p-5 text-left text-sm ring-1 ring-inset ring-border/50">
            <p className="font-semibold">Why was my account suspended?</p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-muted-foreground">
              <li>Violation of terms of service</li>
              <li>Suspicious activity detected</li>
              <li>Payment or billing issues</li>
            </ul>
          </div>

          <div className="rounded-xl border border-dashed p-5 text-center ring-1 ring-inset ring-border/30">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Contact support for assistance</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/70">
              support@indflow.com &middot; (555) 123-4567
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
