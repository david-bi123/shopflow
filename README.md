This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production checklist — public access

The app has **no IP-based access control** in code. Anyone on the public internet can reach `/`, `/login`, `/register`, and the public receipt/invoice routes. All other routes are protected by an authenticated session.

After deploying to Vercel, complete these one-time steps so users on any IP can sign in and use the app:

1. **Health check first** — visit `https://<your-domain>/api/health`. It should return `{"status":"ok", ...}` with `200`. If you get `503`, the database isn't reachable yet.
2. **Allow Vercel → TiDB Cloud.** TiDB Cloud's IP allowlist is the only thing blocking public access to the database. Go to **TiDB Cloud → Cluster → Security → IP Allowlist → Add `0.0.0.0/0`** (allow from anywhere) or add the Vercel region IPs you deploy to.
3. **Set the `NEXTAUTH_SECRET`** in Vercel project env vars to a long random string (not the dev placeholder).
4. **`NEXTAUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** are auto-set by `vercel.json` to the deployed URL — no manual config needed.
5. **Seed the database** once by running `npm run seed` against your TiDB Cloud cluster.
