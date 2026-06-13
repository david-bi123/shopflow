# ADR-001: Money representation in the database

**Status:** Accepted (current)
**Date:** 2026-06-13

## Context

The shop management platform stores all monetary amounts as `DOUBLE` in
MySQL (TiDB). The Drizzle schema defines these as `double(...)` and they
serialize as JavaScript `number` over the wire.

This is a known risk:

- `Number.MAX_SAFE_INTEGER` is 2^53 - 1 = 9_007_199_254_740_991. Every
  amount in the DB is well under that, so **integer precision is fine**
  for any realistic shop.
- BUT: `double` in MySQL is IEEE-754 64-bit float, which is what JS
  `number` is. Float arithmetic is associative-but-not-commutative:
  `0.1 + 0.2 !== 0.3`. Aggregation in SQL (`SUM(total)`) and
  serialization across JSON can produce tiny but non-zero rounding
  errors that grow over time.
- The app already does `Math.round(x * 100) / 100` everywhere before
  storing — so individual inserts are quantized to 2 decimal places
  and the float imprecision is masked. But this is a *convention* the
  code must follow; the schema doesn't enforce it.
- Money also flows through `JSON.stringify` (the `items` column is JSON,
  and we post-sale/invoice data back to the client as JSON), where
  floats are guaranteed to round-trip safely for the magnitudes we
  care about (under 2^53).

## Decision

**We accept the current `DOUBLE` representation and the manual
`Math.round(x * 100) / 100` convention for now, with the explicit plan
to migrate to integer minor units (cents/pesewas) before total
cumulative revenue per tenant approaches ~$10M (~10^15 cents).**

Reasons to defer the migration:

1. The current code consistently quantizes before storage. The only
   path that could introduce drift is a future code path that skips
   the `* 100 / 100` round.
2. Migrating to integer cents requires:
   - A schema change on `sales`, `invoices`, `debt_ledger`,
     `customers.totalRevenue`, `customers.totalDebt`, and
     `settings.taxRate`.
   - A backfill that multiplies every existing row by 100 and stores
     in `BIGINT`.
   - Rewriting every read path to do `formatCents(value)` at the edge.
   - Rewriting every validation schema (zod currently parses
     `number`, would need to parse `int`).
3. We're early-stage. A migration at this point is much cheaper than
   after a year of data.

## Migration plan (when we do it)

1. **Add `*_cents BIGINT` columns** alongside each `*_amount` column.
   Keep both columns in sync via a write path wrapper. New code reads
   and writes the cents columns; old code still works.
2. **Backfill** all existing rows: `UPDATE sales SET total_cents = ROUND(total * 100)`.
3. **Cutover**: swap the Drizzle column definitions, drop the float
   columns, regenerate Drizzle types.
4. **Add a CHECK constraint** in the schema: every write must be an
   integer (Drizzle `bigint('total', { mode: 'number' })` is type-safe
   for our magnitudes; consider `mode: 'bigint'` for the largest
   aggregates).

## What we WILL do in this pass

- Document the invariant: "Every monetary write must pass through
  `Math.round(x * 100) / 100` first." This is already the convention
  in every action that touches money; we're not adding enforcement
  because linting decimal arithmetic is non-trivial and the cost
  outweighs the benefit at current scale.
- Add a test (in the future Vitest suite) that asserts
  `recordSalePayment` and `recordDebtPayment` produce exactly the
  expected balance after a sequence of partial payments.

## When to revisit

When any of these is true:
- A single tenant's lifetime revenue exceeds ~$1M.
- A bug surfaces where the displayed balance differs from the sum of
  ledger entries by more than 0.01.
- We need to support multi-currency with per-row exchange rates.
- A payment processor integration requires integer cents (Stripe does
  not, but some local processors do).
