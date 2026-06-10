'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Mail, ArrowRight, Loader2, ArrowLeft, Sparkles, Lock, CheckCircle, Sun, Moon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { theme, setTheme } = useTheme()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast.success('If an account exists, you\'ll receive a password reset email.')
    setSent(true)
    setIsLoading(false)
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>
      {/* Left Brand Panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">IndFlow</span>
          </Link>
        </div>
        <div className="relative space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">Forgot your password?</h2>
            <p className="text-lg text-white/80">No worries, we&apos;ll help you get back in.</p>
          </div>
          <div className="space-y-4">
            {['Enter your registered email address', 'Check your inbox for reset link', 'Create a new password'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <span className="text-white/80">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-white/60">
          &copy; {new Date().getFullYear()} IndFlow. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="relative flex items-center justify-center p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_50%_20%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%)] lg:hidden" />
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-sm"
        >
          <Card className="border-none shadow-xl backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
              >
                {sent ? (
                  <CheckCircle className="h-6 w-6 text-success" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </motion.div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                {sent
                  ? 'Check your email for the reset link'
                  : 'Enter your email and we\'ll send you a reset link'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sent ? (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" name="email" type="email" placeholder="name@example.com" className="pl-10" required disabled={isLoading} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full shadow-lg shadow-primary/25" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="rounded-lg bg-success/10 p-4 text-center text-sm text-success">
                    Reset link sent! Check your email inbox.
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                    Send another link
                  </Button>
                </motion.div>
              )}
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
