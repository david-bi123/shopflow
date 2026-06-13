import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy applied to every response.
 *
 * The policy is intentionally strict but allows:
 *  - inline styles & a small set of known inline-script shims (Next.js
 *    needs `'unsafe-inline'` for some hydration bootstrap and `'unsafe-eval'`
 *    for dev tools; we leave them off in production)
 *  - data: URLs for fonts/images used by PDFKit
 *  - Cloudinary (images), Resend (emails, outbound only), and the
 *    application origin for connect/XHR
 *
 * Add new origins here when introducing a new third-party dependency that
 * fetches assets in the browser.
 */
const csp = [
  `default-src 'self'`,
  // Next.js boots a few inline scripts and styles. `'unsafe-inline'` is
  // required for first-party styles; nonce-based CSPs are a larger refactor
  // and out of scope for this pass. `'unsafe-eval'` is dev-only: Next.js
  // uses eval() for HMR and stack-trace mapping, but production builds
  // never need it. We always allow it in development so `next dev` keeps
  // working, and strip it in production.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  // PDFKit and the QR generator use data: URIs for images/fonts.
  `img-src 'self' data: blob: https://res.cloudinary.com`,
  `font-src 'self' data:`,
  // PostHog analytics + any other first-party XHR/fetch.
  `connect-src 'self' https://*.posthog.com https://us.i.posthog.com https://eu.i.posthog.com https://res.cloudinary.com`,
  // We don't embed arbitrary third-party frames.
  `frame-src 'self'`,
  // Cloudinary media + Resend image-tracking (if used).
  `media-src 'self' https://res.cloudinary.com`,
  // Only embed our own origin; PDF download is handled via same-origin.
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  // Block clickjacking entirely — we don't use frames.
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer leakage: only send origin on cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features we don't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS in production only — browsers ignore over HTTP anyway.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // CSP itself.
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
