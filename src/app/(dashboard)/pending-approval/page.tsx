'use client'

import { Store, Clock, Mail, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is under review. We&apos;ll notify you once it&apos;s approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-left text-sm">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>An administrator will review your registration</li>
              <li>You&apos;ll receive an email once approved</li>
              <li>You can then log in and set up your shop</li>
            </ul>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Need help? Contact support</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              support@indflow.com &middot; (555) 123-4567
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
