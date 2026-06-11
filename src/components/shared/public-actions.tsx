'use client'

import { Copy, Check, Download, Share2, Printer } from 'lucide-react'
import { useState } from 'react'

interface PublicActionsProps {
  pdfUrl: string
  pageUrl: string
  whatsappUrl: string
}

export function PublicActions({ pdfUrl, pageUrl, whatsappUrl }: PublicActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = pageUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
      >
        <Share2 className="h-4 w-4" />
        Share
      </a>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Download className="h-4 w-4" />
        PDF
      </a>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  )
}
