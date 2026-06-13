/**
 * Next.js instrumentation hook. Runs once on server boot (and once on
 * edge boot). We use it to initialize Sentry so we get error reporting
 * and performance traces from the very first request.
 *
 * To enable: `npm install @sentry/nextjs`, set `SENTRY_DSN` in your
 * environment, and the dynamic import below will pick it up
 * automatically. The Sentry SDK is intentionally NOT in `package.json`
 * yet — adding it is a separate change that needs an `npm install` and
 * a config review (tracesSampleRate, beforeSend, etc.).
 *
 * See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return

  // Resolve Sentry at runtime so the absence of the @sentry/nextjs
  // package doesn't break the build when Sentry isn't enabled yet.
  // The dynamic `import()` is wrapped in try/catch so a missing
  // package yields a clear log line, not a hard crash.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = await import(/* webpackIgnore: true */ '@sentry/nextjs' as any).catch(() => null)
    if (!Sentry) {
      console.warn('[instrumentation] SENTRY_DSN is set but @sentry/nextjs is not installed. Run `npm install @sentry/nextjs` to enable error reporting.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentryAny = Sentry as any
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      sentryAny.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
        beforeSendTransaction(event: { user?: unknown }) {
          if (event.user) delete event.user
          return event
        },
      })
    } else if (process.env.NEXT_RUNTIME === 'edge') {
      sentryAny.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
      })
    }
  } catch (err) {
    console.error('[instrumentation] failed to init Sentry', err)
  }
}

