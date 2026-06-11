'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Receipt,
  FileText,
  Users,
  BarChart3,
  Shield,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Store,
  TrendingUp,
  QrCode,
  Sun,
  Moon,
  Check,
  Star,
  Zap,
  Globe,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
]

const features = [
  {
    icon: Receipt,
    title: 'Smart Sales',
    description: 'Record sales in seconds with an interface designed for speed on phones and tablets.',
    gradient: 'from-primary/20 via-primary/10 to-transparent',
  },
  {
    icon: FileText,
    title: 'Professional Invoices',
    description: 'Auto-numbered invoices with public links, PDF export, and WhatsApp sharing built-in.',
    gradient: 'from-chart-2/20 via-chart-2/10 to-transparent',
  },
  {
    icon: Users,
    title: 'Customer Management',
    description: 'Track history, lifetime spend, and contact info for every customer automatically.',
    gradient: 'from-chart-3/20 via-chart-3/10 to-transparent',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Real-time dashboards for today, this week, and this month. Export to CSV anytime.',
    gradient: 'from-chart-1/20 via-chart-1/10 to-transparent',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Granular permissions for owners, admins, and staff. Every action is audit-logged.',
    gradient: 'from-chart-4/20 via-chart-4/10 to-transparent',
  },
  {
    icon: QrCode,
    title: 'Public Receipts',
    description: 'Share receipts via QR code or link. Customers view and download anytime — no login.',
    gradient: 'from-chart-5/20 via-chart-5/10 to-transparent',
  },
]

const steps = [
  {
    number: '01',
    title: 'Register your shop',
    description: 'Create your account in under 2 minutes. Default currency is GHS, change anytime in settings.',
    icon: Store,
  },
  {
    number: '02',
    title: 'Customize',
    description: 'Set your store name, logo, payment methods, and tax rules to match how you work.',
    icon: Globe,
  },
  {
    number: '03',
    title: 'Start selling',
    description: 'Record sales, send invoices, and watch your dashboard fill up in real-time.',
    icon: TrendingUp,
  },
]

const trust = [
  { label: 'Multi-tenant', icon: Shield },
  { label: 'Audit logged', icon: FileText },
  { label: 'Mobile-first', icon: Zap },
  { label: 'Public receipts', icon: QrCode },
]

const faqs = [
  {
    q: 'What is IndFlow and who is it for?',
    a: 'IndFlow is a multi-tenant business management platform built for retail shops, pharmacies, boutiques, and SMEs. It handles sales, invoices, customers, staff, and reports in one place.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Yes. Every new shop starts on a 14-day trial with full access. After the trial you can move to a plan that fits your business, or contact our team for a custom setup.',
  },
  {
    q: 'Is my data isolated from other shops?',
    a: 'Absolutely. Every query in the system is scoped to your tenant. Our database enforces shop-level isolation, so you will never see another shop’s data.',
  },
  {
    q: 'Can my customers view receipts without signing up?',
    a: 'Yes. Every sale and invoice gets a public URL and a QR code. Customers can view, download as PDF, or share on WhatsApp — no account required.',
  },
  {
    q: 'Which currencies are supported?',
    a: 'Ghana Cedis (GHS) is the default, with full support for USD, EUR, GBP, NGN, KES, ZAR, TZS, UGX, RWF, and XOF. Switch anytime in Settings.',
  },
]

function FadeInUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="mb-6 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-secondary-foreground shadow-sm"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      {children}
    </motion.div>
  )
}

function SectionHeading({ label, title, description }: { label?: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      {label && <SectionBadge>{label}</SectionBadge>}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {description && (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{description}</p>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled
            ? 'border-b bg-background/80 backdrop-blur-xl shadow-sm'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform group-hover:scale-105">
              <Store className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">IndFlow</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hover:bg-accent/50"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b bg-background px-4 pb-6 pt-2 shadow-lg md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-3" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full justify-start"
              >
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
              </Button>
              <Button size="sm" asChild className="w-full">
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  Get Started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-20 pb-16 sm:pt-24">
          <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%),radial-gradient(600px_circle_at_80%_10%,color-mix(in_oklab,var(--chart-2)_10%,transparent),transparent_55%),radial-gradient(500px_circle_at_50%_90%,color-mix(in_oklab,var(--chart-1)_8%,transparent),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-5 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-widest shadow-sm sm:mb-6">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Built for Ghanaian businesses
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                The Modern Business OS
              </span>
              <br />
              <span>for Retail Shops</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg sm:text-xl"
            >
              Sales, invoices, customers, and reports — all in one platform your team will actually love using. GHS by default.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4"
            >
              <Button size="lg" className="h-12 w-full px-8 text-base font-semibold shadow-lg shadow-primary/25 sm:w-auto" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 w-full px-8 text-base font-semibold sm:w-auto" asChild>
                <Link href="#features">View Features</Link>
              </Button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:mt-12 sm:gap-x-7 sm:text-sm"
            >
              {trust.map((t) => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <t.icon className="h-3.5 w-3.5 text-primary" />
                  <span>{t.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12 sm:mt-16"
            >
              <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border bg-card shadow-2xl backdrop-blur-sm">
                <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/80 sm:h-3 sm:w-3" />
                  <div className="h-2.5 w-2.5 rounded-full bg-warning/80 sm:h-3 sm:w-3" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/80 sm:h-3 sm:w-3" />
                  <div className="ml-3 flex-1 rounded-md bg-muted px-2.5 py-0.5 text-left text-[10px] text-muted-foreground sm:ml-4 sm:px-3 sm:py-1 sm:text-xs">
                    indflow.app/dashboard
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-px bg-border">
                  <div className="col-span-1 hidden border-r bg-muted/20 p-3 sm:block sm:p-4">
                    <div className="mb-4 h-3 w-20 rounded bg-muted-foreground/15 sm:mb-6 sm:h-4" />
                    <div className="space-y-1 sm:space-y-1.5">
                      {['Dashboard', 'Sales', 'Invoices', 'Customers', 'Reports'].map((item, i) => (
                        <div
                          key={item}
                          className={cn(
                            'rounded-md px-2.5 py-1.5 text-[10px] font-medium sm:px-3 sm:py-2 sm:text-xs',
                            i === 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-5 p-3 sm:col-span-4 sm:p-4">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                      <div className="h-4 w-24 rounded bg-muted-foreground/15 sm:h-5 sm:w-32" />
                      <div className="h-6 w-16 rounded-md bg-primary/20 sm:h-8 sm:w-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg border bg-card p-2.5 sm:p-3">
                          <div className="mb-1.5 h-2.5 w-12 rounded bg-muted-foreground/15 sm:mb-2 sm:h-3 sm:w-16" />
                          <div className="h-4 w-16 rounded bg-muted-foreground/15 sm:h-6 sm:w-20" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5 sm:gap-3 sm:p-3">
                          <div className="h-6 w-6 rounded-full bg-muted-foreground/15 sm:h-8 sm:w-8" />
                          <div className="flex-1">
                            <div className="mb-1 h-2.5 w-24 rounded bg-muted-foreground/15 sm:h-3 sm:w-32" />
                            <div className="h-2.5 w-16 rounded bg-muted-foreground/15 sm:h-3 sm:w-20" />
                          </div>
                          <div className="h-4 w-12 rounded bg-success/20 sm:h-6 sm:w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              label="Features"
              title="Everything you need to run your shop"
              description="Powerful tools designed for retail businesses of all sizes."
            />

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {features.map((feature, i) => (
                <FadeInUp key={feature.title} delay={i * 0.1}>
                  <Card className="group relative h-full overflow-hidden border-border/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className={cn(
                      'pointer-events-none absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      feature.gradient
                    )} />
                    <CardHeader>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/30 sm:mb-4 sm:h-12 sm:w-12">
                        <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                      <CardDescription className="text-sm sm:text-base">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative border-t px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              label="How it works"
              title="Get started in minutes"
              description="Three simple steps to transform your business operations."
            />

            <div className="relative grid gap-8 md:grid-cols-3 md:gap-12">
              <div className="absolute left-1/2 top-16 hidden h-0.5 w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />

              {steps.map((step, i) => (
                <FadeInUp key={step.title} delay={i * 0.15} className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5 sm:mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20 sm:h-20 sm:w-20">
                      <step.icon className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-lg sm:h-8 sm:w-8 sm:text-xs">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold sm:text-xl">{step.title}</h3>
                  <p className="max-w-xs text-sm text-muted-foreground sm:text-base">{step.description}</p>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative border-t px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              label="FAQ"
              title="Frequently asked questions"
              description="Everything you need to know about IndFlow."
            />

            <div className="space-y-2.5 sm:space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i
                return (
                  <div
                    key={i}
                    className="group rounded-xl border bg-card transition-all duration-200 hover:border-muted-foreground/20 hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-6 sm:py-4"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-medium transition-colors group-hover:text-primary sm:text-base">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 shrink-0 text-muted-foreground transition-all duration-300',
                          isOpen && 'rotate-180 text-primary'
                        )}
                      />
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t px-4 py-3.5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:py-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-4 py-20 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 shadow-2xl sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_0%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
              <CardHeader className="relative p-0 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to transform your business?
                </CardTitle>
                <CardDescription className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">
                  Join shops already using IndFlow. Get started in under 2 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative mt-6 p-0 sm:mt-8">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    window.location.href = '/register'
                  }}
                  className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                    className="flex h-12 w-full rounded-lg border-0 bg-white/20 px-4 text-sm text-white shadow-inner outline-none transition-all placeholder:text-white/60 focus:bg-white/30 focus:ring-2 focus:ring-white/30"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    variant="secondary"
                    className="h-12 shrink-0 border-0 bg-white text-primary shadow-lg hover:bg-white/90"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-primary-foreground/60 sm:mt-6">
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> No credit card</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> 14-day free trial</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Cancel anytime</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-5 md:flex-row md:gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-sm">
                <Store className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight">IndFlow</span>
            </Link>

            <div className="flex flex-wrap justify-center gap-5 text-sm text-muted-foreground sm:gap-6">
              <Link href="#features" className="transition-colors hover:text-foreground">Features</Link>
              <Link href="#how" className="transition-colors hover:text-foreground">How it works</Link>
              <Link href="#faq" className="transition-colors hover:text-foreground">FAQ</Link>
              <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
              <Link href="/register" className="transition-colors hover:text-foreground">Get started</Link>
            </div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              &copy; {new Date().getFullYear()} IndFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
