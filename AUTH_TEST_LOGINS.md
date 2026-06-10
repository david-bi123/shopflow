# IndFlow — Auth Test Logins

These accounts are created by the seed script (`src/lib/db/seed.ts`) and use NextAuth Credentials auth (`src/lib/auth/auth.ts`).

## Super Admin
- **Email:** `super@indflow.com`
- **Password:** `Admin123!`

## Shop Owners (Multi-tenant owners)
- **Email:** `owner@alice.com` — **Password:** `IndFlow123!`
- **Email:** `owner@bob.com` — **Password:** `IndFlow123!`
- **Email:** `owner@charlie.com` — **Password:** `IndFlow123!`

## Admin / Staff
During seeding, **Admin** and **Staff** user emails are generated using Faker, so they are **not deterministic**.
To test Admin/Staff, either:
1) capture the generated emails from the DB after seeding, or
2) update the seed script to use deterministic emails for Admin/Staff roles.

## Login
The NextAuth configuration uses:
- **Sign in page:** `/login`

Use the Credentials login form at `/login` with **email + password** from above.
