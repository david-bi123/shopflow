'use client'

import { AlertTriangle, Mail, Store } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription>
            Your account has been suspended. Please contact support for more information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-left text-sm">
            <p className="font-medium">Why was my account suspended?</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Violation of terms of service</li>
              <li>Suspicious activity detected</li>
              <li>Payment or billing issues</li>
            </ul>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Contact support for assistance</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              support@shopflow.com &middot; (555) 123-4567
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
