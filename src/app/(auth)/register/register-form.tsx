'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Building2, Phone, Sparkles, Sun, Moon, UserPlus, ShieldCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { registerShop } from '@/lib/actions/auth-actions'

interface FieldErrors {
  shopName?: string
  name?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

const benefits = [
  { title: 'Multi-tenant secure', description: 'Your data is fully isolated and encrypted at rest.' },
  { title: 'Beautiful analytics', description: 'Live dashboards for today, this week, and this month.' },
  { title: 'Public receipts', description: 'Customers can view and share receipts via QR — no signup.' },
  { title: 'Built for Ghana', description: 'Ghana Cedis by default, with Mobile Money and bank transfer.' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const { theme, setTheme } = useTheme()

  function validate(formData: FormData): FieldErrors {
    const fieldErrors: FieldErrors = {}
    const shopName = formData.get('shopName') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!shopName?.trim()) fieldErrors.shopName = 'Shop name is required'
    if (!name?.trim()) fieldErrors.name = 'Your name is required'
    if (!email?.trim()) fieldErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Invalid email address'
    if (!password) fieldErrors.password = 'Password is required'
    else if (password.length < 8) fieldErrors.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) fieldErrors.confirmPassword = 'Passwords do not match'

    return fieldErrors
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const fieldErrors = validate(formData)

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setIsLoading(true)

    try {
      const result = await registerShop(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Registration submitted! Awaiting approval.')
      router.push('/pending-approval')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
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

      {/* Brand panel — desktop only */}
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
            <Store className="h-10 w-10 text-primary-foreground" />
          </motion.div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight">Create your shop</h1>
          <p className="mb-10 text-lg text-muted-foreground">
            Join hundreds of businesses already running on IndFlow. Free 14-day trial, no credit card required.
          </p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-4"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={itemVariants}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex items-start gap-4 rounded-xl border bg-card/60 px-5 py-3.5 text-left shadow-sm backdrop-blur-sm"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-chart-2/5 blur-3xl" />
      </motion.div>

      {/* Form panel */}
      <div className="relative flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">IndFlow</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Create your shop</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in the details below to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="shopName"
                      name="shopName"
                      placeholder="My Store"
                      className={cn('pl-10 transition-all', errors.shopName && 'border-destructive')}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {errors.shopName && <p className="text-xs text-destructive">{errors.shopName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      className={cn('pl-10 transition-all', errors.name && 'border-destructive')}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      className={cn('pl-10 transition-all', errors.email && 'border-destructive')}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+233 ..."
                      className="pl-10 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      className={cn('pl-10 pr-10 transition-all', errors.password && 'border-destructive')}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter"
                      className={cn('pl-10 pr-10 transition-all', errors.confirmPassword && 'border-destructive')}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
              </div>

              <Button
                type="submit"
                className="relative w-full overflow-hidden bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                By creating an account, you agree to our terms and privacy policy.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
