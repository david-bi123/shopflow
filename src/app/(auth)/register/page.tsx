'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Building2, Phone, Check, Sparkles, Sun, Moon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

const features = [
  { title: 'Smart Inventory Management', description: 'Track stock levels in real-time with automated low-stock alerts and bulk updates.' },
  { title: 'Beautiful Analytics Dashboard', description: 'Visualize sales trends, top products, and revenue with interactive charts.' },
  { title: 'Seamless Multi-Store Support', description: 'Manage multiple locations from a single unified dashboard with ease.' },
  { title: 'Lightning-Fast Performance', description: 'Built on cutting-edge tech for instant page loads and smooth interactions.' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
} as const

const cardVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
} as const

export default function RegisterPage() {
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
      await registerShop(formData)
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>
      {/* Gradient Orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[140px]" />
      </div>

      {/* Subtle grid overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        className="relative z-10 flex w-full max-w-5xl flex-col gap-0 lg:flex-row lg:rounded-2xl lg:shadow-2xl lg:backdrop-blur-xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left Brand Panel */}
        <motion.div
          className="relative flex flex-col justify-between overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/90 via-primary to-indigo-700 p-8 text-primary-foreground lg:w-[42%] lg:rounded-l-2xl lg:rounded-r-none"
          variants={itemVariants}
        >
          {/* Decorative orbs inside panel */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-[60px]" />

          <div className="relative">
            <motion.div
              className="mb-6 flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Store className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">ShopFlow</span>
            </motion.div>

            <Badge variant="outline" className="mb-4 border-white/20 bg-white/10 text-white backdrop-blur-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              Premium Platform
            </Badge>

            <h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight">
              Why ShopFlow?
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-white/80">
              Everything you need to run your online store like a pro.
            </p>

            <div className="space-y-5">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  className="flex gap-3"
                  variants={itemVariants}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="text-xs text-white/70">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="relative mt-10 border-t border-white/10 pt-6">
            <p className="text-xs leading-relaxed text-white/60">
              &quot;ShopFlow transformed how we manage our inventory. The analytics alone saved us hours every week.&quot;
            </p>
            <p className="mt-2 text-xs font-medium text-white/80">— Sarah K., Store Owner</p>
          </div>
        </motion.div>

        {/* Right Form Panel */}
        <motion.div
          className="flex-1 rounded-b-2xl border border-border/50 bg-card/80 backdrop-blur-2xl lg:rounded-r-2xl lg:rounded-bl-none"
          variants={cardVariants}
        >
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight">Create your Shop</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in the details below to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="shopName" name="shopName" placeholder="My Store" className={cn('pl-10', errors.shopName && 'border-destructive')} required disabled={isLoading} />
                  </div>
                  {errors.shopName && <p className="text-xs text-destructive">{errors.shopName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" name="name" placeholder="John Doe" className={cn('pl-10', errors.name && 'border-destructive')} required disabled={isLoading} />
                  </div>
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="name@example.com" className={cn('pl-10', errors.email && 'border-destructive')} required disabled={isLoading} />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone" name="phone" type="tel" placeholder="+1 (555) 123-4567" className="pl-10" disabled={isLoading} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      className={cn('pl-10 pr-10', errors.confirmPassword && 'border-destructive')}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
