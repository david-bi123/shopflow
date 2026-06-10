'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Receipt,
  FileText,
  Users,
  BarChart3,
  Shield,
  MessageCircle,
  Menu,
  X,
  Check,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Store,
  TrendingUp,
  QrCode,
  Clock,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
]

const features = [
  {
    icon: Receipt,
    title: 'Smart Sales',
    description: 'Record sales in seconds with an intuitive interface designed for speed.',
    gradient: 'from-primary/20 via-primary/10 to-transparent',
  },
  {
    icon: FileText,
    title: 'Professional Invoices',
    description: 'Create and send beautiful invoices with payment links and automatic numbering.',
    gradient: 'from-chart-2/20 via-chart-2/10 to-transparent',
  },
  {
    icon: Users,
    title: 'Customer Management',
    description: 'Track customer history, preferences, and build lasting relationships.',
    gradient: 'from-chart-3/20 via-chart-3/10 to-transparent',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Know your numbers with real-time reports, charts, and exportable data.',
    gradient: 'from-chart-1/20 via-chart-1/10 to-transparent',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Granular permissions for owners, admins, and staff. Keep data secure.',
    gradient: 'from-chart-4/20 via-chart-4/10 to-transparent',
  },
  {
    icon: QrCode,
    title: 'Public Receipts & QR',
    description: 'Share receipts via QR code or link. Customers view and download anytime.',
    gradient: 'from-chart-5/20 via-chart-5/10 to-transparent',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create Your Shop',
    description: 'Register your business in under 2 minutes. No credit card required.',
    icon: Store,
  },
  {
    number: '02',
    title: 'Start Selling',
    description: 'Record sales, create invoices, and manage customers effortlessly.',
    icon: Receipt,
  },
  {
    number: '03',
    title: 'Grow Smart',
    description: 'Leverage analytics and reports to make data-driven decisions.',
    icon: TrendingUp,
  },
]

const tiers = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for small shops just getting started.',
    features: ['Up to 100 sales/month', '1 staff account', 'Basic reports', 'Email support', 'QR code receipts'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$19',
    period: '/month',
    description: 'Ideal for growing retail businesses.',
    features: ['Unlimited sales', '5 staff accounts', 'Advanced analytics', 'WhatsApp sharing', 'Custom invoices', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$49',
    period: '/month',
    description: 'For established businesses with advanced needs.',
    features: ['Everything in Growth', 'Unlimited staff', 'API access', 'Dedicated manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
]

const faqs = [
  {
    q: 'What is ShopFlow and who is it for?',
    a: 'ShopFlow is a modern business management platform designed for retail shops and SMEs. It helps you manage sales, invoices, customers, staff, and reports — all in one beautiful interface.',
  },
  {
    q: 'Can I try ShopFlow before committing?',
    a: 'Absolutely! Our Starter plan is free forever with no credit card required. You can start a 14-day free trial of any paid plan to explore all features.',
  },
  {
    q: 'Is my data secure?',
    a: 'Security is our priority. We use industry-standard encryption for data at rest and in transit. Your data is backed up daily and stored securely on enterprise-grade cloud infrastructure.',
  },
  {
    q: 'Can I share receipts via WhatsApp?',
    a: 'Yes! WhatsApp sharing is available on all paid plans. Your customers receive professional receipts and invoices directly on WhatsApp with a single tap.',
  },
  {
    q: 'How does staff management work?',
    a: 'Create role-based accounts for your team. Assign granular permissions so each staff member sees only what they need. Track sales performance and activity logs in real time.',
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
    <div className="mx-auto mb-16 max-w-2xl text-center">
      {label && <SectionBadge>{label}</SectionBadge>}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {description && (
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
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
            <span className="text-lg font-bold tracking-tight">ShopFlow</span>
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
            className="flex items-center justify-center md:hidden"
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
            className="border-b bg-background px-4 pb-6 pt-2 md:hidden"
          >
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2" />
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
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="w-full">
                <Link href="/register">
                  Get Started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-20">
          <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%),radial-gradient(600px_circle_at_80%_10%,color-mix(in_oklab,var(--chart-2)_10%,transparent),transparent_55%),radial-gradient(500px_circle_at_50%_90%,color-mix(in_oklab,var(--chart-1)_8%,transparent),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-xs font-medium uppercase tracking-widest shadow-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Now in Public Beta
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
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
            >
              Sales, invoices, customers, and reports — all in one platform your team will actually love using.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                <Link href="#features">View Features</Link>
              </Button>
            </motion.div>

            {/* Dashboard Preview Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-20"
            >
              <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border bg-card shadow-2xl backdrop-blur-sm">
                <div className="flex items-center gap-1.5 border-b bg-muted/30 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-destructive/80" />
                  <div className="h-3 w-3 rounded-full bg-warning/80" />
                  <div className="h-3 w-3 rounded-full bg-success/80" />
                  <div className="ml-4 flex-1 rounded-md bg-muted px-3 py-1 text-left text-xs text-muted-foreground">
                    shopflow.app/dashboard
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-px bg-border">
                  <div className="col-span-1 border-r bg-muted/20 p-4">
                    <div className="mb-6 h-4 w-20 rounded bg-muted-foreground/15" />
                    <div className="space-y-1.5">
                      {['Dashboard', 'Sales', 'Invoices', 'Customers', 'Reports'].map((item, i) => (
                        <div
                          key={item}
                          className={cn(
                            'rounded-md px-3 py-2 text-xs font-medium',
                            i === 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-4 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-5 w-32 rounded bg-muted-foreground/15" />
                      <div className="h-8 w-24 rounded-md bg-primary/20" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg border bg-card p-3">
                          <div className="mb-2 h-3 w-16 rounded bg-muted-foreground/15" />
                          <div className="h-6 w-20 rounded bg-muted-foreground/15" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                          <div className="h-8 w-8 rounded-full bg-muted-foreground/15" />
                          <div className="flex-1">
                            <div className="mb-1 h-3 w-32 rounded bg-muted-foreground/15" />
                            <div className="h-3 w-20 rounded bg-muted-foreground/15" />
                          </div>
                          <div className="h-6 w-16 rounded bg-success/20" />
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
        <section id="features" className="relative px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              label="Features"
              title="Everything you need to run your shop"
              description="Powerful tools designed for retail businesses of all sizes."
            />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <FadeInUp key={feature.title} delay={i * 0.1}>
                  <Card className="group relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className={cn(
                      'pointer-events-none absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      feature.gradient
                    )} />
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/30">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative border-t px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              label="How It Works"
              title="Get started in minutes"
              description="Three simple steps to transform your business operations."
            />

            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="absolute left-1/2 top-16 hidden h-0.5 w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />

              {steps.map((step, i) => (
                <FadeInUp key={step.title} delay={i * 0.15} className="relative flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/20">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="max-w-xs text-muted-foreground">{step.description}</p>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="relative px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              label="Pricing"
              title="Simple, transparent pricing"
              description="No hidden fees. Start free and upgrade as you grow."
            />

            <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
              {tiers.map((tier, i) => (
                <FadeInUp key={tier.name} delay={i * 0.1}>
                  <Card
                    className={cn(
                      'relative flex h-full flex-col',
                      tier.popular
                        ? 'border-primary shadow-xl ring-1 ring-primary'
                        : 'shadow-md'
                    )}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="px-4 py-1 text-xs font-semibold uppercase tracking-wider shadow-lg">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                        <span className="text-sm text-muted-foreground">{tier.period}</span>
                      </div>
                      <CardDescription className="mt-2">{tier.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-3 text-sm">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className={cn('w-full shadow-lg', tier.popular ? 'shadow-primary/25' : '')}
                        variant={tier.popular ? 'default' : 'outline'}
                        asChild
                      >
                        <Link href="/register">{tier.cta}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative border-t px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              label="FAQ"
              title="Frequently asked questions"
              description="Everything you need to know about ShopFlow."
            />

            <div className="space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i

                return (
                  <div
                    key={i}
                    className="group rounded-xl border bg-card transition-all duration-200 hover:border-muted-foreground/20 hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left"
                    >
                      <span className="text-base font-medium transition-colors group-hover:text-primary">
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
                      animate={{
                        height: isOpen ? 'auto' : 0,
                        opacity: isOpen ? 1 : 0,
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t px-6 py-4 text-sm leading-relaxed text-muted-foreground">
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
        <section id="contact" className="relative px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 shadow-2xl sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_0%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
              <CardHeader className="relative p-0 text-center">
                <CardTitle className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to transform your business?
                </CardTitle>
                <CardDescription className="mt-4 text-lg text-primary-foreground/80">
                  Join thousands of shops already using ShopFlow. Start your free trial today.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative mt-8 p-0">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                <p className="mt-4 text-center text-xs text-primary-foreground/60">
                  No credit card required. Free plan available forever.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-sm">
                <Store className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight">ShopFlow</span>
            </Link>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="transition-colors hover:text-foreground">Features</Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground">Pricing</Link>
              <Link href="#faq" className="transition-colors hover:text-foreground">FAQ</Link>
              <Link href="#contact" className="transition-colors hover:text-foreground">Contact</Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            </div>

            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ShopFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
