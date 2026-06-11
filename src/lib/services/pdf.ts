import PDFDocument from 'pdfkit'

interface SalePdfData {
  saleNumber: string
  customerName?: string
  customerPhone?: string
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  notes?: string
  createdAt: string
}

interface InvoicePdfData {
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  items: Array<{ name: string; description?: string; quantity: number; price: number; total: number }>
  subtotal: number
  discount: number
  tax: number
  total: number
  status: string
  dueDate: string
  notes?: string
  createdAt: string
}

interface StoreInfo {
  name: string
  phone?: string
  email?: string
  address?: string
  footer?: string
}

const HEADER_COLOR = '#0f172a'
const HEADER_ACCENT = '#1e3a5f'
const TABLE_HEADER_BG = '#1e40af'
const ROW_EVEN = '#f8fafc'
const ROW_ODD = '#ffffff'
const BORDER_COLOR = '#e2e8f0'
const TEXT_PRIMARY = '#1e293b'
const TEXT_MUTED = '#64748b'

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: string[],
  widths: number[],
  alignments: ('left' | 'right')[],
  isHeader = false,
  rowIndex?: number
) {
  let x = isHeader ? 50 : 50

  if (!isHeader && rowIndex !== undefined) {
    const rowColor = rowIndex % 2 === 0 ? ROW_EVEN : ROW_ODD
    doc.rect(x, y - 3, widths.reduce((a, b) => a + b, 0), 18).fill(rowColor)
    doc.fillColor(TEXT_PRIMARY)
  }

  if (isHeader) {
    doc.rect(x, y - 3, widths.reduce((a, b) => a + b, 0), 20).fill(TABLE_HEADER_BG)
    doc.fillColor('#ffffff')
  }

  cols.forEach((text, i) => {
    doc.fontSize(isHeader ? 8 : 8)
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
    const padding = isHeader ? 6 : 4
    if (alignments[i] === 'right') {
      doc.text(text, x + widths[i] - padding, y, { width: widths[i] - 4, align: 'right' })
    } else {
      doc.text(text, x + padding, y, { width: widths[i] - 8 })
    }
    x += widths[i]
  })

  if (!isHeader) {
    doc.fillColor(TEXT_PRIMARY)
  }
}

function drawHeader(doc: PDFKit.PDFDocument, store: StoreInfo) {
  doc.rect(0, 0, doc.page.width, 80).fill(HEADER_COLOR)
  doc.rect(0, 80, doc.page.width, 4).fill(HEADER_ACCENT)

  doc.fillColor('#ffffff')
  doc.fontSize(16).font('Helvetica-Bold')
  doc.text(store.name, 50, 18, { align: 'left' })

  doc.fontSize(7).font('Helvetica')
  const rightX = doc.page.width - 50
  let infoY = 14
  if (store.address) {
    doc.text(store.address, rightX, infoY, { align: 'right' })
    infoY += 11
  }
  if (store.phone) {
    doc.text(`Tel: ${store.phone}`, rightX, infoY, { align: 'right' })
    infoY += 11
  }
  if (store.email) {
    doc.text(store.email, rightX, infoY, { align: 'right' })
    infoY += 11
  }

  doc.fillColor(TEXT_PRIMARY)
}

function drawFooter(doc: PDFKit.PDFDocument, store: StoreInfo) {
  const bottomY = doc.page.height - 30
  doc.rect(0, bottomY - 6, doc.page.width, 36).fill('#f8fafc')
  doc.moveTo(50, bottomY - 6).lineTo(doc.page.width - 50, bottomY - 6).stroke(BORDER_COLOR)

  doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
  doc.text(store.footer || 'Thank you for your business!', 50, bottomY + 2, { align: 'center', width: doc.page.width - 100 })

  const pageText = `Page 1`
  doc.text(pageText, doc.page.width - 50 - 80, bottomY + 2, { width: 80, align: 'right' })
  doc.fillColor(TEXT_PRIMARY)
}

function drawTotalsBox(
  doc: PDFKit.PDFDocument,
  totals: { label: string; value: number; showIf?: boolean }[],
  totalAmount: number,
  startX: number
) {
  const boxWidth = 195
  let y = doc.y + 4

  doc.rect(startX, y - 4, boxWidth, 4).fill('#1e40af')
  y += 4

  doc.fontSize(8).font('Helvetica')
  totals.forEach((t) => {
    if (t.showIf === false) return
    doc.text(t.label, startX + 8, y, { width: 90 })
    doc.text(`GHS ${Math.abs(t.value).toFixed(2)}`, startX + 8, y, { width: boxWidth - 16, align: 'right' })
    y += 13
  })

  doc.moveTo(startX, y).lineTo(startX + boxWidth, y).stroke(BORDER_COLOR)
  y += 4

  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('Total:', startX + 8, y, { width: 90 })
  doc.text(`GHS ${totalAmount.toFixed(2)}`, startX + 8, y, { width: boxWidth - 16, align: 'right' })
  y += 16

  return y
}

export function generateSaleReceiptPdf(sale: SalePdfData, store: StoreInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [280, 600], margin: 10 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = 280
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    doc.rect(0, 0, pageWidth, 50).fill(HEADER_COLOR)
    doc.rect(0, 50, pageWidth, 3).fill(HEADER_ACCENT)

    doc.fillColor('#ffffff')
    doc.fontSize(11).font('Helvetica-Bold').text(store.name, margin, 16, { align: 'center', width: contentWidth })
    doc.fillColor(TEXT_PRIMARY)

    let y = 62

    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
    doc.text('RECEIPT', margin, y, { align: 'center', width: contentWidth })
    y += 14

    doc.fontSize(7).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text(`#${sale.saleNumber} | ${sale.createdAt}`, margin, y, { align: 'center', width: contentWidth })
    y += 12

    if (sale.customerName) {
      doc.fillColor(TEXT_PRIMARY).fontSize(7).font('Helvetica')
      doc.text(`Customer: ${sale.customerName}`, margin, y, { width: contentWidth })
      y += 10
      if (sale.customerPhone) {
        doc.text(`Phone: ${sale.customerPhone}`, margin, y, { width: contentWidth })
        y += 10
      }
    }

    y += 4
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke(BORDER_COLOR)
    y += 6

    const colWidths = [contentWidth * 0.4, contentWidth * 0.18, contentWidth * 0.21, contentWidth * 0.21]
    const tableTotalWidth = colWidths.reduce((a, b) => a + b, 0)

    doc.rect(margin, y - 2, tableTotalWidth, 16).fill(TABLE_HEADER_BG)
    doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold')
    let hx = margin
    const headers = ['Item', 'Qty', 'Price', 'Total']
    const hAlignments: ('left' | 'right')[] = ['left', 'right', 'right', 'right']
    headers.forEach((text, i) => {
      const pad = 3
      if (hAlignments[i] === 'right') {
        doc.text(text, hx + colWidths[i] - pad, y + 1, { width: colWidths[i] - 2, align: 'right' })
      } else {
        doc.text(text, hx + pad, y + 1, { width: colWidths[i] - 6 })
      }
      hx += colWidths[i]
    })
    doc.fillColor(TEXT_PRIMARY)
    y += 16

    sale.items.forEach((item, idx) => {
      const rowColor = idx % 2 === 0 ? ROW_EVEN : ROW_ODD
      doc.rect(margin, y - 2, tableTotalWidth, 14).fill(rowColor)
      doc.fillColor(TEXT_PRIMARY).fontSize(6).font('Helvetica')
      const values = [
        item.name.substring(0, 20),
        String(item.quantity),
        `${item.price.toFixed(2)}`,
        `${item.subtotal.toFixed(2)}`,
      ]
      let rx = margin
      values.forEach((text, i) => {
        const pad = 3
        if (hAlignments[i] === 'right') {
          doc.text(text, rx + colWidths[i] - pad, y, { width: colWidths[i] - 2, align: 'right' })
        } else {
          doc.text(text, rx + pad, y, { width: colWidths[i] - 6 })
        }
        rx += colWidths[i]
      })
      y += 14
    })

    y += 4
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke(BORDER_COLOR)
    y += 6

    const lineHeight = 11
    doc.fontSize(7).font('Helvetica')
    doc.text('Subtotal:', margin, y, { width: contentWidth - 80, continued: true })
    doc.text(`GHS ${sale.subtotal.toFixed(2)}`, { align: 'right', width: 80 })
    y += lineHeight

    if (sale.discount > 0) {
      doc.text('Discount:', margin, y, { width: contentWidth - 80, continued: true })
      doc.text(`-GHS ${sale.discount.toFixed(2)}`, { align: 'right', width: 80 })
      y += lineHeight
    }

    if (sale.tax > 0) {
      doc.text('Tax:', margin, y, { width: contentWidth - 80, continued: true })
      doc.text(`GHS ${sale.tax.toFixed(2)}`, { align: 'right', width: 80 })
      y += lineHeight
    }

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke(BORDER_COLOR)
    y += 4

    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Total:', margin, y, { width: contentWidth - 80, continued: true })
    doc.text(`GHS ${sale.total.toFixed(2)}`, { align: 'right', width: 80 })
    y += 14

    doc.fontSize(7).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text(`Paid via ${sale.paymentMethod}`, margin, y, { align: 'center', width: contentWidth })
    y += 12

    const paidY = y + 2
    doc.rect(pageWidth - margin - 60, paidY, 60, 16).fill('#059669')
    doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold')
    doc.text('PAID', pageWidth - margin - 60, paidY + 4, { align: 'center', width: 60 })
    doc.fillColor(TEXT_PRIMARY)

    y += 10

    if (sale.notes) {
      doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
      doc.text(sale.notes, margin, y, { align: 'center', width: contentWidth })
      y += 12
    }

    y += 8
    doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
    doc.text(store.footer || 'Thank you for your purchase!', margin, y, { align: 'center', width: contentWidth })

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

    drawHeader(doc, store)

    let y = 95

    doc.fontSize(22).font('Helvetica-Bold').fillColor(HEADER_COLOR)
    doc.text('INVOICE', 50, y, { align: 'right' })
    y += 16

    doc.fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
    doc.text(`#${invoice.invoiceNumber}`, 50, y, { align: 'right' })
    y += 20

    const statusColors: Record<string, string> = {
      paid: '#059669',
      sent: '#2563eb',
      draft: '#6b7280',
      overdue: '#dc2626',
      cancelled: '#6b7280',
    }
    const statusColor = statusColors[invoice.status] || '#6b7280'
    doc.roundedRect(50, y - 2, 70, 18, 4).fill(statusColor)
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
    doc.text(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1), 58, y + 1)
    doc.fillColor(TEXT_PRIMARY)
    y += 26

    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
    doc.text('Bill To:', 50, y)
    y += 13
    doc.fontSize(9).font('Helvetica').fillColor(TEXT_PRIMARY)
    doc.text(invoice.customerName, 50, y)
    y += 12
    if (invoice.customerEmail) { doc.text(invoice.customerEmail, 50, y); y += 10 }
    if (invoice.customerPhone) { doc.text(invoice.customerPhone, 50, y); y += 10 }
    if (invoice.customerAddress) { doc.text(invoice.customerAddress, 50, y); y += 10 }
    y += 4

    const detailsRightX = 350
    let detailY = 95
    doc.fontSize(9).font('Helvetica').fillColor(TEXT_PRIMARY)
    doc.text('Invoice Date:', detailsRightX, detailY, { width: 90 })
    doc.font('Helvetica-Bold').text(invoice.createdAt, detailsRightX + 95, detailY, { width: 100 })
    detailY += 14
    doc.font('Helvetica')
    doc.text('Due Date:', detailsRightX, detailY, { width: 90 })
    doc.font('Helvetica-Bold').text(invoice.dueDate, detailsRightX + 95, detailY, { width: 100 })
    detailY += 14
    doc.font('Helvetica')
    doc.text('Payment Terms:', detailsRightX, detailY, { width: 90 })
    doc.font('Helvetica-Bold').text('Due on receipt', detailsRightX + 95, detailY, { width: 100 })

    if (detailY > y) y = detailY
    y += 8

    doc.moveTo(50, y).lineTo(545, y).stroke(BORDER_COLOR)
    y += 10

    const colWidths = [220, 70, 90, 90]
    const tableTotalWidth = colWidths.reduce((a, b) => a + b, 0)

    doc.rect(50, y - 3, tableTotalWidth, 20).fill(TABLE_HEADER_BG)
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
    let hx = 50
    const headers = ['Item', 'Quantity', 'Unit Price', 'Total']
    const hAlignments: ('left' | 'right')[] = ['left', 'right', 'right', 'right']
    headers.forEach((text, i) => {
      const pad = 6
      if (hAlignments[i] === 'right') {
        doc.text(text, hx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
      } else {
        doc.text(text, hx + pad, y + 2, { width: colWidths[i] - 8 })
      }
      hx += colWidths[i]
    })
    doc.fillColor(TEXT_PRIMARY)
    y += 20

    invoice.items.forEach((item, idx) => {
      const rowColor = idx % 2 === 0 ? ROW_EVEN : ROW_ODD
      doc.rect(50, y - 3, tableTotalWidth, 20).fill(rowColor)
      doc.fillColor(TEXT_PRIMARY).fontSize(8).font('Helvetica')
      const values = [
        item.name + (item.description ? `\n${item.description}` : ''),
        String(item.quantity),
        `GHS ${item.price.toFixed(2)}`,
        `GHS ${item.total.toFixed(2)}`,
      ]
      let rx = 50
      values.forEach((text, i) => {
        const pad = 6
        if (hAlignments[i] === 'right') {
          doc.text(text, rx + colWidths[i] - pad, y + 2, { width: colWidths[i] - 4, align: 'right' })
        } else {
          doc.text(text, rx + pad, y + 2, { width: colWidths[i] - 8 })
        }
        rx += colWidths[i]
      })
      y += 20
    })

    y += 6
    doc.moveTo(350, y).lineTo(545, y).stroke(BORDER_COLOR)

    const totals = [
      { label: 'Subtotal', value: invoice.subtotal },
      { label: 'Discount', value: -invoice.discount, showIf: invoice.discount > 0 },
      { label: 'Tax', value: invoice.tax, showIf: invoice.tax > 0 },
    ]

    drawTotalsBox(doc, totals, invoice.total, 350)

    if (invoice.notes) {
      doc.moveDown(1)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_PRIMARY)
      doc.text('Notes:')
      doc.moveDown(0.3)
      doc.font('Helvetica').fillColor(TEXT_MUTED)
      doc.text(invoice.notes)
    }

    drawFooter(doc, store)

    doc.end()
  })
}
