'use client'

import { useState } from 'react'
import { Check, Copy, Download, ExternalLink, Link2, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BulkShareSale {
  id: string
  saleNumber: string
  publicToken?: string
}

interface BulkShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sales: BulkShareSale[]
}

function CopyButton({
  text,
  label,
  variant = 'outline',
  className,
}: {
  text: string
  label: string
  variant?: 'outline' | 'ghost'
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const iconOnly = label === ''
  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      aria-label={iconOnly ? 'Copy link' : undefined}
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          toast.success('Copied to clipboard')
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('Failed to copy')
        }
      }}
    >
      {iconOnly ? (
        copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )
      ) : copied ? (
        <>
          <Check className="mr-1.5 size-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1.5 size-3.5" />
          {label}
        </>
      )}
    </Button>
  )
}

export function BulkShareDialog({ open, onOpenChange, sales }: BulkShareDialogProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const tokens = sales.map((s) => s.publicToken).filter(Boolean)
  const combinedUrl = `${origin}/r/bulk?tokens=${tokens.join(',')}`
  const bulkPdfUrl = `${origin}/api/r/bulk-pdf?tokens=${tokens.join(',')}`

  const links = sales.map((s) => ({
    saleNumber: s.saleNumber,
    url: `${origin}/r/${s.publicToken ?? s.saleNumber}`,
  }))

  function shareWhatsApp() {
    const message = `Invoices for ${sales.length} sale${sales.length === 1 ? '' : 's'}:\n${combinedUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  async function copyAll() {
    const text = links.map((l) => l.url).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('All invoice links copied')
    } catch {
      toast.error('Failed to copy links')
    }
  }

  async function downloadPdf() {
    setDownloadingPdf(true)
    try {
      const res = await fetch(bulkPdfUrl)
      if (!res.ok) {
        toast.error('Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoices-${sales.length}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Share {sales.length} invoice{sales.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            One public link shows all invoices on a single page. Recipients can also download them
            as one combined PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Combined link */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="size-3.5" />
              One link for all {sales.length} invoice{sales.length === 1 ? '' : 's'}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="min-w-0 flex-1">
                <p className="break-all text-xs leading-snug text-muted-foreground">{combinedUrl}</p>
              </div>
              <CopyButton
                text={combinedUrl}
                label="Copy"
                variant="ghost"
                className="shrink-0 h-8 px-2.5"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => void copyAll()}>
                <Copy className="mr-1.5 size-3.5" />
                Copy all links
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={shareWhatsApp}>
                <Share2 className="mr-1.5 size-3.5" />
                Share on WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={combinedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-3.5" />
                  Open
                </a>
              </Button>
            </div>
          </div>

          {/* Individual links */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Individual links
            </div>
            <div className="max-h-56 space-y-2 overflow-x-hidden overflow-y-auto rounded-xl border border-border/60 p-2">
              {links.map((l) => (
                <div
                  key={l.saleNumber}
                  className="flex items-center gap-2 overflow-hidden rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{l.saleNumber}</p>
                    <p className="break-all text-[11px] leading-snug text-muted-foreground">
                      {l.url}
                    </p>
                  </div>
                  <CopyButton text={l.url} label="" variant="ghost" className="shrink-0 h-7 w-7 px-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => void downloadPdf()} disabled={downloadingPdf}>
            {downloadingPdf ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            Download combined PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}