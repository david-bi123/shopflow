'use client'

import { useState } from 'react'
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
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
  downloadingPdf: boolean
  onDownloadPdf: () => void
}

function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 rounded-full"
      aria-label="Copy link"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('Failed to copy link')
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

export function BulkShareDialog({
  open,
  onOpenChange,
  sales,
  downloadingPdf,
  onDownloadPdf,
}: BulkShareDialogProps) {
  const [copiedAll, setCopiedAll] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const links = sales.map((s) => ({
    saleNumber: s.saleNumber,
    url: `${origin}/r/${s.publicToken ?? s.saleNumber}`,
  }))

  async function copyAll() {
    const text = links.map((l) => l.url).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAll(true)
      toast.success('All invoice links copied')
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      toast.error('Failed to copy links')
    }
  }

  function shareWhatsApp() {
    const text = links.map((l) => `${l.saleNumber}: ${l.url}`).join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Share {sales.length} invoice{sales.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Each sale has its own public link. Copy them all, share on WhatsApp, or download one
            combined PDF with each receipt on its own page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-2">
            {links.map((l) => (
              <div
                key={l.saleNumber}
                className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{l.saleNumber}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{l.url}</p>
                </div>
                <CopyLinkButton text={l.url} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => void copyAll()}>
              {copiedAll ? (
                <Check className="mr-1.5 size-4 text-emerald-500" />
              ) : (
                <Copy className="mr-1.5 size-4" />
              )}
              {copiedAll ? 'Copied' : 'Copy all links'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={shareWhatsApp}>
              <Share2 className="mr-1.5 size-4" />
              Share on WhatsApp
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onDownloadPdf} disabled={downloadingPdf}>
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