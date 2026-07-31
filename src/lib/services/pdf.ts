import PDFDocument from 'pdfkit'
import type { TaxItem } from '@/lib/validations/sale'

export interface SalePaymentHistoryEntry {
  type: string
  amount: number
  notes?: string
  createdAt: string
}

export interface SalePdfData {
  saleNumber: string
  customerName?: string
  customerPhone?: string
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
  subtotal: number
  discountPercent: number
  discount: number
  tax: number
  taxItems: TaxItem[]
  total: number
  amountPaid: number
  amountOwed: number
  paymentMethod: string
  notes?: string
  createdAt: string
  updatedAt: string
  /** Linked debt_ledger entries (oldest first). Drives the payment-history block. */
  paymentHistory: SalePaymentHistoryEntry[]
}

export interface InvoicePdfData {
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  items: Array<{ name: string; description?: string; quantity: number; price: number; total: number }>
  subtotal: number
  discountPercent: number
  discount: number
  tax: number
  taxItems: TaxItem[]
  total: number
  status: string
  dueDate: string
  notes?: string
  createdAt: string
}

export interface StoreInfo {
  name: string
  description?: string
  phone?: string
  email?: string
  address?: string
  taxNumber?: string
  footer?: string
  /** ISO-4217 currency code (e.g. GHS, USD, NGN). Defaults to GHS. */
  currency?: string
  /** Currency symbol prefix (e.g. "GH₵", "$", "₦"). Defaults to the code itself. */
  currencySymbol?: string
}

const HEADER_COLOR = '#0f172a'
const HEADER_ACCENT = '#1e3a5f'
const TABLE_HEADER_BG = '#1e40af'
const ROW_EVEN = '#f8fafc'
const ROW_ODD = '#ffffff'
const BORDER_COLOR = '#e2e8f0'
const TEXT_PRIMARY = '#1e293b'
const TEXT_MUTED = '#64748b'
const SUCCESS_GREEN = '#059669'
const DISCOUNT_RED = '#dc2626'

/**
 * Currency-aware money formatter used by both the receipt and invoice PDFs.
 * The previous implementation hard-coded "GHS" which was wrong for any
 * tenant that configured a different currency in Settings.
 */
function formatMoney(value: number, store: StoreInfo): string {
  const code = store.currency || 'GHS'
  const symbol = store.currencySymbol || code
  return `${pdfSafeSymbol(symbol)} ${value.toFixed(2)}`
}

/**
 * PDFKit's built-in Helvetica uses the WinAnsi charset, which cannot
 * render the Ghana cedi (₵, U+20B5) or Naira (₦, U+20A6) glyphs — they
 * would print as blank/boxed characters. Map them to WinAnsi-safe
 * equivalents (¢ is the cent sign, in WinAnsi) so money prints cleanly.
 */
function pdfSafeSymbol(symbol: string): string {
  return symbol
    .replace('\u20b5', '\u00a2') // ₵ → ¢
    .replace('\u20a6', 'N') // ₦ → N
}

/**
 * Formats an ISO date string the same way the on-screen receipt does
 * (e.g. "31 Jul 2026"). Falls back to the raw value if it isn't a date.
 */
function formatPdfDate(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Invoice-book style header: the store name is printed first and
 * centered on top, then the address, phone, email and tax ID follow
 * underneath — one per line — exactly like a paper receipt book.
 */
function drawA4Header(doc: PDFKit.PDFDocument, store: StoreInfo) {
  const headerHeight = 122
  const startY = 34
  doc.rect(0, 0, doc.page.width, headerHeight).fill(HEADER_COLOR)
  doc.rect(0, headerHeight, doc.page.width, 4).fill(HEADER_ACCENT)

  // Name first, centered on top
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
  doc.text(store.name, 50, startY, { width: doc.page.width - 100, align: 'center' })

  let infoY = startY + 26
  doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica')
  if (store.description) {
    doc.font('Helvetica-Oblique')
    doc.text(store.description, 50, infoY, { width: doc.page.width - 100, align: 'center' })
    doc.font('Helvetica')
    infoY += 11
  }
  if (store.address) {
    doc.text(store.address, 50, infoY, { width: doc.page.width - 100, align: 'center' })
    infoY += 10
  }
  if (store.phone) {
    doc.text(`Tel: ${store.phone}`, 50, infoY, { width: doc.page.width - 100, align: 'center' })
    infoY += 10
  }
  if (store.email) {
    doc.text(store.email, 50, infoY, { width: doc.page.width - 100, align: 'center' })
    infoY += 10
  }
  if (store.taxNumber) {
    doc.text(`Tax ID: ${store.taxNumber}`, 50, infoY, { width: doc.page.width - 100, align: 'center' })
  }

  doc.fillColor(TEXT_PRIMARY)
}

function drawA4Footer(doc: PDFKit.PDFDocument, store: StoreInfo) {
  const bottomY = doc.page.height - 36
  doc.rect(0, bottomY - 6, doc.page.width, 42).fill('#f8fafc')
  doc.moveTo(50, bottomY - 6).lineTo(doc.page.width - 50, bottomY - 6).stroke(BORDER_COLOR)

  doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica')

  // Relax the bottom margin while drawing the footer so PDFKit doesn't
  // treat these absolute-positioned lines as overflowing and inject
  // spurious extra pages.
  const savedBottom = doc.page.margins.bottom
  doc.page.margins.bottom = 0

  doc.text(
    store.footer || 'Thank you for your business!',
    50,
    bottomY + 4,
    { align: 'center', width: doc.page.width - 100 }
  )

  doc.fontSize(7)
  const range = doc.bufferedPageRange() as { start: number; count: number } | null
  const pageText = `Page ${range ? range.start + 1 : 1}`
  doc.text(
    `${store.name} \u2022 Generated by IndFlow`,
    50,
    bottomY + 22,
    { width: 200, align: 'left' }
  )
  doc.text(pageText, doc.page.width - 50 - 80, bottomY + 22, { width: 80, align: 'right' })

  doc.page.margins.bottom = savedBottom
  doc.fillColor(TEXT_PRIMARY)
}

interface DrawTotalsOpts {
  subtotal: number
  discountPercent: number
  discount: number
  taxItems: TaxItem[]
  tax: number
  total: number
  startX: number
  doc: PDFKit.PDFDocument
  width?: number
  includeDiscountLabel?: boolean
  store: StoreInfo
}

function drawTotals(opts: DrawTotalsOpts) {
  const { doc, startX, store } = opts
  const boxWidth = opts.width ?? 215
  let y = doc.y + 4

  doc.rect(startX, y - 4, boxWidth, 4).fill(TABLE_HEADER_BG)
  y += 4

  doc.fontSize(9).font('Helvetica').fillColor(TEXT_PRIMARY)

  doc.text('Subtotal', startX + 8, y, { width: boxWidth - 16 })
  doc.text(formatMoney(opts.subtotal, store), startX + 8, y, { width: boxWidth - 16, align: 'right' })
  y += 14

  if (opts.discount > 0) {
    const label = opts.includeDiscountLabel && opts.discountPercent > 0
      ? `Discount (${opts.discountPercent}%)`
      : 'Discount'
    doc.fillColor(TEXT_PRIMARY).text(label, startX + 8, y, { width: boxWidth - 16 })
    doc.fillColor(DISCOUNT_RED).text(`-${formatMoney(opts.discount, store)}`, startX + 8, y, { width: boxWidth - 16, align: 'right' })
    doc.fillColor(TEXT_PRIMARY)
    y += 14
  }

  if (opts.taxItems.length > 0) {
    for (const t of opts.taxItems) {
      doc.text(`${t.name} (${t.rate}%)`, startX + 8, y, { width: boxWidth - 16 })
      doc.text(formatMoney(t.amount, store), startX + 8, y, { width: boxWidth - 16, align: 'right' })
      y += 14
    }
  } else if (opts.tax > 0) {
    doc.text('Tax', startX + 8, y, { width: boxWidth - 16 })
    doc.text(formatMoney(opts.tax, store), startX + 8, y, { width: boxWidth - 16, align: 'right' })
    y += 14
  }

  doc.moveTo(startX, y).lineTo(startX + boxWidth, y).stroke(BORDER_COLOR)
  y += 6

  doc.fontSize(12).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
  doc.text('TOTAL', startX + 8, y, { width: boxWidth - 16 })
  doc.text(formatMoney(opts.total, store), startX + 8, y, { width: boxWidth - 16, align: 'right' })
  y += 18

  return y
}

export function generateSaleReceiptPdf(sale: SalePdfData, store: StoreInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    drawA4Header(doc, store)

    let y = 142

    // --- Title + sale number + payment status badge (centered) ---
    doc.fontSize(24).font('Helvetica-Bold').fillColor(HEADER_COLOR)
    doc.text('RECEIPT', 50, y, { width: doc.page.width - 100, align: 'center' })
    y += 20

    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text(`#${sale.saleNumber}`, 50, y, { width: doc.page.width - 100, align: 'center' })
    y += 24

    // Payment status badge — Paid (green), Partially Paid (amber), Unpaid (red)
    const owed = Math.max(0, Math.round((sale.amountOwed ?? 0) * 100) / 100)
    const paid = Math.max(0, Math.round((sale.amountPaid ?? 0) * 100) / 100)
    let statusLabel: string
    let statusColor: string
    if (owed <= 0.005) {
      statusLabel = 'Paid in Full'
      statusColor = SUCCESS_GREEN
    } else if (paid > 0.005) {
      statusLabel = 'Partially Paid'
      statusColor = '#d97706'
    } else {
      statusLabel = 'Unpaid'
      statusColor = '#dc2626'
    }
    const badgeWidth = statusLabel.length > 10 ? 110 : 90
    const badgeX = (doc.page.width - badgeWidth) / 2
    doc.roundedRect(badgeX, y - 2, badgeWidth, 20, 5).fill(statusColor)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    doc.text(statusLabel, badgeX, y + 2, { align: 'center', width: badgeWidth })
    doc.fillColor(TEXT_PRIMARY)
    y += 30

    // --- Customer + Date / Payment side-by-side ---
    doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
    doc.text('Customer:', 50, y)
    y += 14
    doc.fontSize(10).font('Helvetica').fillColor(TEXT_PRIMARY)
    doc.text(sale.customerName || 'Walk-in customer', 50, y)
    y += 12
    if (sale.customerPhone) { doc.text(sale.customerPhone, 50, y); y += 11 }
    y += 4

    const rightStartX = 350
    let detailY = y
    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text('Receipt Date:', rightStartX, detailY)
    doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
    doc.text(formatPdfDate(sale.createdAt), rightStartX + 100, detailY, { width: 145 })
    detailY += 14
    doc.fillColor(TEXT_MUTED).font('Helvetica')
    doc.text('Payment Method:', rightStartX, detailY)
    doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
    const methodLabel = sale.paymentMethod
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    doc.text(methodLabel, rightStartX + 100, detailY, { width: 145 })
    detailY += 14
    if (sale.updatedAt && sale.updatedAt !== sale.createdAt) {
      doc.fillColor(TEXT_MUTED).font('Helvetica')
      doc.text('Last Updated:', rightStartX, detailY)
      doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
      doc.text(formatPdfDate(sale.updatedAt), rightStartX + 100, detailY, { width: 145 })
      detailY += 14
    }
    if (store.taxNumber) {
      doc.fillColor(TEXT_MUTED).font('Helvetica')
      doc.text('Our Tax ID:', rightStartX, detailY)
      doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
      doc.text(store.taxNumber, rightStartX + 100, detailY, { width: 145 })
    }

    if (detailY > y) y = detailY
    y += 14

    // --- Items table ---
    doc.moveTo(50, y).lineTo(545, y).stroke(BORDER_COLOR)
    y += 8

    const colWidths = [200, 70, 110, 115]
    const tableTotalWidth = colWidths.reduce((a, b) => a + b, 0)

    doc.rect(50, y - 3, tableTotalWidth, 22).fill(TABLE_HEADER_BG)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    let hx = 50
    ;['Item', 'Quantity', 'Unit Price', 'Total'].forEach((text, i) => {
      const pad = 8
      if (i === 0) doc.text(text, hx + pad, y + 2, { width: colWidths[i] - 8 })
      else doc.text(text, hx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
      hx += colWidths[i]
    })
    doc.fillColor(TEXT_PRIMARY)
    y += 22

    sale.items.forEach((item, idx) => {
      const rowHeight = 18
      const rowColor = idx % 2 === 0 ? ROW_EVEN : ROW_ODD
      doc.rect(50, y - 3, tableTotalWidth, rowHeight).fill(rowColor)
      doc.fillColor(TEXT_PRIMARY).fontSize(9).font('Helvetica')
      let rx = 50
      const values = [
        item.name,
        String(item.quantity),
        formatMoney(item.price, store),
        formatMoney(item.subtotal, store),
      ]
      values.forEach((text, i) => {
        const pad = 8
        if (i === 0) doc.text(text, rx + pad, y + 2, { width: colWidths[i] - 8 })
        else doc.text(text, rx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
        rx += colWidths[i]
      })
      y += rowHeight
    })

    y += 10

    // --- Totals box on the right (subtotal, discount, tax) ---
    drawTotals({
      doc,
      startX: 330,
      width: 215,
      subtotal: sale.subtotal,
      discountPercent: sale.discountPercent,
      discount: sale.discount,
      taxItems: sale.taxItems,
      tax: sale.tax,
      total: sale.total,
      store,
    })

    y += 6

    // --- Payment summary (highlighted box) ---
    const paymentBoxX = 330
    const paymentBoxW = 215
    const paymentBoxY = y
    const paymentBoxH = owed > 0.005 ? 96 : 60
    doc.roundedRect(paymentBoxX, paymentBoxY, paymentBoxW, paymentBoxH, 4).fillAndStroke('#f1f5f9', BORDER_COLOR)
    let py = paymentBoxY + 10
    doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
    doc.text('PAYMENT SUMMARY', paymentBoxX + 10, py, { width: paymentBoxW - 20 })
    py += 14

    doc.fontSize(9).font('Helvetica').fillColor(TEXT_PRIMARY)
    doc.text('Total', paymentBoxX + 10, py, { width: 100 })
    doc.text(formatMoney(sale.total, store), paymentBoxX + 10, py, { width: paymentBoxW - 20, align: 'right' })
    py += 13

    doc.text('Amount Paid', paymentBoxX + 10, py, { width: 100 })
    doc.fillColor(SUCCESS_GREEN).text(formatMoney(paid, store), paymentBoxX + 10, py, { width: paymentBoxW - 20, align: 'right' })
    doc.fillColor(TEXT_PRIMARY)
    py += 13

    if (owed > 0.005) {
      doc.moveTo(paymentBoxX + 10, py - 2).lineTo(paymentBoxX + paymentBoxW - 10, py - 2).stroke(BORDER_COLOR)
      py += 6
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#dc2626')
      doc.text('Balance Due', paymentBoxX + 10, py, { width: 120 })
      doc.text(formatMoney(owed, store), paymentBoxX + 10, py, { width: paymentBoxW - 20, align: 'right' })
      doc.fillColor(TEXT_PRIMARY)
      py += 16
    }

    y = paymentBoxY + paymentBoxH + 10

    // --- Payment history (if any linked debt_ledger entries) ---
    const history = (sale.paymentHistory ?? []).filter((h) => h.type !== 'sale_created')
    if (history.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
      doc.text('Payment History', 50, y)
      y += 14
      doc.moveTo(50, y).lineTo(545, y).stroke(BORDER_COLOR)
      y += 6
      doc.fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      ;['Date', 'Type', 'Notes', 'Amount'].forEach((label, i) => {
        const xs = [50, 160, 260, 480]
        const ws = [100, 90, 210, 65]
        if (i === 3) doc.text(label, xs[i], y, { width: ws[i], align: 'right' })
        else doc.text(label, xs[i], y, { width: ws[i] })
      })
      y += 12
      history.forEach((h, idx) => {
        const rowColor = idx % 2 === 0 ? ROW_EVEN : ROW_ODD
        doc.rect(50, y - 3, 495, 16).fill(rowColor)
        doc.fontSize(8).font('Helvetica').fillColor(TEXT_PRIMARY)
        const typeLabel = h.type === 'manual_payment' ? 'Payment' : h.type.replace(/_/g, ' ')
        const amountStr = `${h.amount < 0 ? '-' : ''}${formatMoney(Math.abs(h.amount), store)}`
        doc.text(formatPdfDate(h.createdAt), 50, y, { width: 100 })
        doc.text(typeLabel, 160, y, { width: 90 })
        doc.text(h.notes ?? '', 260, y, { width: 210 })
        doc.text(amountStr, 480, y, { width: 65, align: 'right' })
        y += 16
      })
      doc.fillColor(TEXT_PRIMARY)
      y += 6
    }

    if (sale.notes) {
      doc.moveDown(1)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
      doc.text('Notes:')
      doc.moveDown(0.4)
      doc.font('Helvetica').fillColor(TEXT_MUTED)
      doc.text(sale.notes, { width: 280 })
    }

    drawA4Footer(doc, store)

    doc.end()
  })
}

export function generateInvoicePdf(invoice: InvoicePdfData, store: StoreInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    drawA4Header(doc, store)

    let y = 142

    // --- Title + invoice number + status badge (centered) ---
    doc.fontSize(24).font('Helvetica-Bold').fillColor(HEADER_COLOR)
    doc.text('INVOICE', 50, y, { width: doc.page.width - 100, align: 'center' })
    y += 20

    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text(`#${invoice.invoiceNumber}`, 50, y, { width: doc.page.width - 100, align: 'center' })
    y += 24

    const statusColors: Record<string, string> = {
      paid: SUCCESS_GREEN,
      sent: '#2563eb',
      draft: '#6b7280',
      overdue: '#dc2626',
      cancelled: '#6b7280',
    }
    const statusColor = statusColors[invoice.status] || '#6b7280'
    const badgeWidth = 80
    const badgeX = (doc.page.width - badgeWidth) / 2
    doc.roundedRect(badgeX, y - 2, badgeWidth, 20, 5).fill(statusColor)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    doc.text(
      invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
      badgeX,
      y + 2,
      { align: 'center', width: badgeWidth }
    )
    doc.fillColor(TEXT_PRIMARY)
    y += 30

    // --- Bill To + Dates side-by-side ---
    doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
    doc.text('Bill To:', 50, y)
    y += 14
    doc.fontSize(10).font('Helvetica').fillColor(TEXT_PRIMARY)
    doc.text(invoice.customerName, 50, y)
    y += 12
    if (invoice.customerEmail) { doc.text(invoice.customerEmail, 50, y); y += 11 }
    if (invoice.customerPhone) { doc.text(invoice.customerPhone, 50, y); y += 11 }
    if (invoice.customerAddress) { doc.text(invoice.customerAddress, 50, y, { width: 220 }); y += 11 }
    y += 4

    const rightStartX = 350
    let detailY = y
    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text('Invoice Date:', rightStartX, detailY)
    doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
    doc.text(formatPdfDate(invoice.createdAt), rightStartX + 100, detailY, { width: 145 })
    detailY += 14
    doc.fillColor(TEXT_MUTED).font('Helvetica')
    doc.text('Due Date:', rightStartX, detailY)
    doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
    doc.text(formatPdfDate(invoice.dueDate), rightStartX + 100, detailY, { width: 145 })
    detailY += 14
    if (store.taxNumber) {
      doc.fillColor(TEXT_MUTED).font('Helvetica')
      doc.text('Our Tax ID:', rightStartX, detailY)
      doc.fillColor(TEXT_PRIMARY).font('Helvetica-Bold')
      doc.text(store.taxNumber, rightStartX + 100, detailY, { width: 145 })
    }

    if (detailY > y) y = detailY
    y += 14

    // --- Items table ---
    doc.moveTo(50, y).lineTo(545, y).stroke(BORDER_COLOR)
    y += 8

    const colWidths = [200, 70, 110, 115]
    const tableTotalWidth = colWidths.reduce((a, b) => a + b, 0)

    doc.rect(50, y - 3, tableTotalWidth, 22).fill(TABLE_HEADER_BG)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    let hx = 50
    ;['Description', 'Quantity', 'Unit Price', 'Total'].forEach((text, i) => {
      const pad = 8
      if (i === 0) doc.text(text, hx + pad, y + 2, { width: colWidths[i] - 8 })
      else doc.text(text, hx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
      hx += colWidths[i]
    })
    doc.fillColor(TEXT_PRIMARY)
    y += 22

    invoice.items.forEach((item, idx) => {
      const rowHeight = item.description ? 26 : 18
      const rowColor = idx % 2 === 0 ? ROW_EVEN : ROW_ODD
      doc.rect(50, y - 3, tableTotalWidth, rowHeight).fill(rowColor)
      doc.fillColor(TEXT_PRIMARY).fontSize(9).font('Helvetica')
      let rx = 50
      const lineTotal = (item.total && item.total > 0)
        ? item.total
        : Math.round((Number(item.quantity) || 0) * (Number(item.price) || 0) * 100) / 100
      const values = [
        item.description ? `${item.name}\n${item.description}` : item.name,
        String(item.quantity),
        formatMoney(item.price, store),
        formatMoney(lineTotal, store),
      ]
      values.forEach((text, i) => {
        const pad = 8
        if (i === 0) doc.text(text, rx + pad, y + 2, { width: colWidths[i] - 8 })
        else doc.text(text, rx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
        rx += colWidths[i]
      })
      y += rowHeight
    })

    y += 10

    // --- Totals box on the right ---
    drawTotals({
      doc,
      startX: 330,
      width: 215,
      subtotal: invoice.subtotal,
      discountPercent: invoice.discountPercent,
      discount: invoice.discount,
      taxItems: invoice.taxItems,
      tax: invoice.tax,
      total: invoice.total,
      includeDiscountLabel: true,
      store,
    })

    if (invoice.notes) {
      doc.moveDown(2)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
      doc.text('Notes / Terms:')
      doc.moveDown(0.4)
      doc.font('Helvetica').fillColor(TEXT_MUTED)
      doc.text(invoice.notes, { width: 280 })
    }

    drawA4Footer(doc, store)

    doc.end()
  })
}
