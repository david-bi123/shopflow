import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { getSaleByPublicToken } from '@/lib/actions/sale-actions'
import { PublicActions } from '@/components/shared/public-actions'
import { PublicReceipt, type PublicSale } from '@/components/public/receipt'

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sale = (await getSaleByPublicToken(token)) as unknown as PublicSale | null

  if (!sale) {
    notFound()
  }

  const currency = sale.currency ?? 'GHS'
  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${token}`
  const pdfUrl = `/api/r/${token}/pdf`
  const whatsappMessage = `Invoice ${sale.saleNumber} - ${sale.customerName || 'Customer'} - Total: ${formatCurrency(sale.total, currency)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}%0A${receiptUrl}`

  return (
    <div className="min-h-screen bg-slate-100 py-6 dark:bg-zinc-950 sm:py-10 print:bg-white print:py-0">
      <div className="mx-auto flex min-h-[calc(100vh_-_3rem)] w-full max-w-3xl flex-col px-4 sm:min-h-[calc(100vh_-_5rem)] print:min-h-0">
        <div className="mb-5 flex items-center justify-between print:hidden sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-all hover:bg-white hover:text-foreground hover:shadow dark:bg-zinc-900/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <PublicActions pdfUrl={pdfUrl} pageUrl={receiptUrl} whatsappUrl={whatsappUrl} />
        </div>

        <PublicReceipt sale={sale} />
      </div>
    </div>
  )
}