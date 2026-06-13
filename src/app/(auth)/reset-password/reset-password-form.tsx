'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Lock, ArrowRight, Loader2, ArrowLeft, Sun, Moon, ShieldCheck, CheckCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/lib/actions/auth-actions'

export function ResetPasswordForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const { theme, setTheme } = useTheme()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    const fd = new FormData()
    fd.set('token', token)
    fd.set('newPassword', password)
    fd.set('confirmPassword', confirm)
    startTransition(async () => {
      const result = await resetPassword(fd)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setDone(true)
      toast.success('Password updated. You can now sign in.')
    })
  }

  return (
    <div className="relative flex min-h-screen">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(800px_circle_at_5%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%),radial-gradient(600px_circle_at_95%_10%,color-mix(in_oklab,var(--chart-2)_10%,transparent),transparent_55%),radial-gradient(500px_circle_at_50%_90%,color-mix(in_oklab,var(--chart-3)_8%,transparent),transparent_50%)] opacity-90" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative hidden w-1/2 flex-col items-center justify-center p-12 lg:flex"
      >
        <div className="relative z-10 max-w-md text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"
          >
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Set a new password</h1>
          <p className="mb-10 text-lg text-muted-foreground">
            Choose a strong password you don&apos;t use anywhere else.
          </p>

          <div className="space-y-3 text-left">
            {[
              { icon: Lock, text: 'At least 8 characters' },
              { icon: ShieldCheck, text: 'Uppercase, lowercase, and a number' },
              { icon: CheckCircle, text: 'Used once — old links are invalidated' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 rounded-xl border bg-card/60 px-5 py-3.5 shadow-sm backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{step.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-chart-2/5 blur-3xl" />
      </motion.div>

      <div className="relative flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <Card className="border-border/60 shadow-xl shadow-black/5 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5"
              >
                {done ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </motion.div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                {done ? 'Your password has been updated' : 'Enter a new password below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!done ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 transition-all"
                        required
                        minLength={8}
                        disabled={isPending}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 transition-all"
                        required
                        minLength={8}
                        disabled={isPending}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="relative w-full overflow-hidden bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                    disabled={isPending}
                    size="lg"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Update password
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 text-center">
                    <CheckCircle className="mx-auto mb-2 h-9 w-9 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">All set</p>
                    <p className="mt-1 text-xs text-emerald-600/80">
                      You can now sign in with your new password.
                    </p>
                  </div>
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Go to sign in
                    </Button>
                  </Link>
                </div>
              )}
              {!done && (
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
