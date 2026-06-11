'use client'

import { Clock, MessageCircle, Mail, Store, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SUPER_ADMIN_WHATSAPP_DISPLAY, superAdminWhatsappLink } from '@/lib/utils/constants'

export default function PendingApprovalPage() {
  const whatsappMessage =
    "Hello, I just registered my shop on IndFlow and it's awaiting approval. Could you please review and activate it?"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_circle_at_50%_-20%,color-mix(in_oklab,var(--amber-500)_14%,transparent),transparent_60%),radial-gradient(600px_circle_at_80%_80%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_55%)]" />

      <Card className="w-full max-w-lg overflow-hidden rounded-2xl border shadow-xl shadow-amber-500/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        <CardHeader className="pb-4 pt-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 via-amber-500/15 to-transparent ring-1 ring-amber-500/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-amber-500/10">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Account Pending Approval</CardTitle>
          <CardDescription className="mt-2 mx-auto max-w-sm text-sm leading-relaxed">
            Your account is under review. We&apos;ll notify you once it&apos;s approved — or you can message the admin now to speed things up.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/30 p-5 text-left text-sm ring-1 ring-inset ring-border/50">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              What happens next?
            </p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              {[
                { icon: ShieldCheck, text: 'An administrator reviews your registration' },
                { icon: CheckCircle2, text: 'You receive an email once approved' },
                { icon: Store, text: 'You can log in and start running your shop' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp CTA — primary action */}
          <a
            href={superAdminWhatsappLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block w-full"
          >
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-105">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Contact admin on WhatsApp</p>
                <p className="truncate text-xs text-muted-foreground">
                  {SUPER_ADMIN_WHATSAPP_DISPLAY} · Get approved faster
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-emerald-600 transition-transform group-hover:translate-x-1" />
            </div>
          </a>

          <div className="rounded-xl border border-dashed p-4 text-center ring-1 ring-inset ring-border/30">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Or wait — we&apos;ll email you once approved</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1 text-sm">
            <Link href="/login" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Already approved? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
