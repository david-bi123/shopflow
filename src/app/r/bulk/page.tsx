import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { getSaleByPublicToken } from '@/lib/actions/sale-actions'
import { PublicReceipt, type PublicSale } from '@/components/public/receipt'

/**
 * Combined public invoice view: one page that stacks every invoice from
 * the provided public tokens, plus a button to download them all as a
 * single PDF (one receipt per page). The link looks like
 * `/r/bulk?tokens=<token1>,<token2>,...`.
 */
export default async function BulkPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ tokens?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.tokens) ? params.tokens : params.tokens ? [params.tokens] : []
  const tokens = [...new Set(raw.flatMap((t) => t.split(',').map((s) => s.trim()).filter(Boolean)))]

  const sales: PublicSale[] = []
  for (const token of tokens) {
    const sale = (await getSaleByPublicToken(token)) as unknown as PublicSale | null
    if (sale) sales.push(sale)
  }

  if (sales.length === 0) {
    notFound()
  }

  const pdfUrl = `/api/r/bulk-pdf?tokens=${tokens.join(',')}`

  return (
    <div className="min-h-screen bg-slate-100 py-6 dark:bg-zinc-950 sm:py-10 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mb-5 flex items-center justify-between print:hidden sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-all hover:bg-white hover:text-foreground hover:shadow dark:bg-zinc-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <a
            href={pdfUrl}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Download PDF ({sales.length})
          </a>
        </div>

        {sales.map((sale, i) => (
          <div key={String(sale.id ?? i)} className={i > 0 ? 'print:break-before-page' : ''}>
            <PublicReceipt sale={sale} />
            {i < sales.length - 1 && (
              <div className="my-8 flex items-center justify-center gap-3 print:hidden">
                <span className="h-px w-16 bg-border/60" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Invoice {i + 1} of {sales.length}
                </span>
                <span className="h-px w-16 bg-border/60" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}