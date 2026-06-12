'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/**
 * Top-of-tree error boundary. This file replaces the root layout
 * during an error so we cannot rely on Tailwind / theme providers —
 * styles here are deliberately self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#fff',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              margin: '0 auto 20px',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #fecaca, #fee2e2)',
              border: '1px solid #fca5a5',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#64748b', lineHeight: 1.55 }}>
            A critical error occurred and the app could not recover. You can try again, or head back
            to the home page.
          </p>
          {error.digest && (
            <p style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '8px 16px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
