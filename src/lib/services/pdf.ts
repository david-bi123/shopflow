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

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: string[],
  widths: number[],
  alignments: ('left' | 'right')[],
  isHeader = false
) {
  let x = 40
  cols.forEach((text, i) => {
    doc.fontSize(isHeader ? 9 : 8)
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
    if (alignments[i] === 'right') {
      doc.text(text, x + widths[i] - 4, y, { width: widths[i], align: 'right' })
    } else {
      doc.text(text, x, y, { width: widths[i] })
    }
    x += widths[i]
  })
}

export function generateSaleReceiptPdf(sale: SalePdfData, store: StoreInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [280, 600], margin: 10 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(14).font('Helvetica-Bold').text(store.name, { align: 'center' })
    doc.fontSize(8).font('Helvetica')
    if (store.address) doc.text(store.address, { align: 'center' })
    if (store.phone) doc.text(`Tel: ${store.phone}`, { align: 'center' })
    if (store.email) doc.text(store.email, { align: 'center' })
    doc.moveDown(0.5)

    doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke()
    doc.moveDown(0.3)

    doc.fontSize(10).font('Helvetica-Bold').text('RECEIPT', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(8).font('Helvetica')
    doc.text(`Receipt #: ${sale.saleNumber}`, { align: 'center' })
    doc.text(`Date: ${sale.createdAt}`, { align: 'center' })
    doc.moveDown(0.3)

    if (sale.customerName) {
      doc.text(`Customer: ${sale.customerName}`)
      if (sale.customerPhone) doc.text(`Phone: ${sale.customerPhone}`)
      doc.moveDown(0.3)
    }

    doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke()
    doc.moveDown(0.2)

    const colWidths = [80, 35, 50, 50]
    drawTableRow(
      doc, doc.y,
      ['Item', 'Qty', 'Price', 'Total'],
      colWidths, ['left', 'right', 'right', 'right'],
      true
    )
    doc.moveDown(0.2)
    doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke()
    doc.moveDown(0.2)

    sale.items.forEach((item) => {
      drawTableRow(
        doc, doc.y,
        [item.name.substring(0, 18), String(item.quantity),
         `${item.price.toFixed(2)}`, `${item.subtotal.toFixed(2)}`],
        colWidths, ['left', 'right', 'right', 'right']
      )
      doc.moveDown(0.2)
    })

    doc.moveDown(0.2)
    doc.moveTo(40, doc.y).lineTo(240, doc.y).stroke()
    doc.moveDown(0.3)

    doc.fontSize(9)
    const lineHeight = 12
    let totalY = doc.y
    doc.font('Helvetica')
    doc.text('Subtotal:', 40, totalY, { width: 160, continued: true })
    doc.text(`GHS ${sale.subtotal.toFixed(2)}`, { align: 'right' })
    totalY += lineHeight

    if (sale.discount > 0) {
      doc.text(`Discount:`, 40, totalY, { width: 160, continued: true })
      doc.text(`-GHS ${sale.discount.toFixed(2)}`, { align: 'right' })
      totalY += lineHeight
    }

    if (sale.tax > 0) {
      doc.text(`Tax:`, 40, totalY, { width: 160, continued: true })
      doc.text(`GHS ${sale.tax.toFixed(2)}`, { align: 'right' })
      totalY += lineHeight
    }

    doc.moveTo(40, totalY).lineTo(240, totalY).stroke()
    totalY += 3

    doc.font('Helvetica-Bold').fontSize(11)
    doc.text('Total:', 40, totalY, { width: 160, continued: true })
    doc.text(`GHS ${sale.total.toFixed(2)}`, { align: 'right' })
    totalY += 16

    doc.font('Helvetica').fontSize(8)
    doc.text(`Paid via ${sale.paymentMethod}`, 40, totalY, { align: 'center', width: 200 })
    totalY += 14

    if (sale.notes) {
      doc.text(sale.notes, 40, totalY, { align: 'center', width: 200 })
      totalY += 14
    }

    totalY += 10
    doc.fontSize(8).font('Helvetica')
    doc.text(store.footer || 'Thank you for your purchase!', 40, totalY, { align: 'center', width: 200 })

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

    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'right' })
    doc.fontSize(10).font('Helvetica').text(`#${invoice.invoiceNumber}`, { align: 'right' })
    doc.moveDown(0.5)

    doc.fontSize(14).font('Helvetica-Bold').text(store.name)
    doc.fontSize(9).font('Helvetica')
    if (store.address) doc.text(store.address)
    if (store.phone) doc.text(`Tel: ${store.phone}`)
    if (store.email) doc.text(store.email)
    doc.moveDown(1)

    const statusColors: Record<string, string> = {
      paid: '#059669',
      sent: '#2563eb',
      draft: '#6b7280',
      overdue: '#dc2626',
      cancelled: '#6b7280',
    }

    doc.roundedRect(doc.x, doc.y, 60, 16, 4).fill(statusColors[invoice.status] || '#6b7280')
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
    doc.text(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1), doc.x + 5, doc.y - 13)
    doc.fillColor('#000000')
    doc.moveDown(1.5)

    const detailsX = 320
    doc.fontSize(9).font('Helvetica')
    doc.text('Invoice Date:', 50, doc.y, { continued: true })
    doc.font('Helvetica-Bold').text(`    ${invoice.createdAt}`, { align: 'right', width: 500 - 50 })
    doc.moveDown(0.5)
    doc.font('Helvetica')
    doc.text('Due Date:', 50, doc.y, { continued: true })
    doc.font('Helvetica-Bold').text(`    ${invoice.dueDate}`, { align: 'right', width: 500 - 50 })
    doc.moveDown(1)

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:')
    doc.fontSize(9).font('Helvetica')
    doc.text(invoice.customerName)
    if (invoice.customerEmail) doc.text(invoice.customerEmail)
    if (invoice.customerPhone) doc.text(invoice.customerPhone)
    if (invoice.customerAddress) doc.text(invoice.customerAddress)

    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.5)

    const colWidths = [220, 70, 90, 90]
    const headerY = doc.y

    doc.rect(50, headerY - 4, 495, 18).fill('#f3f4f6')
    doc.fillColor('#000000')

    drawTableRow(
      doc, headerY,
      ['Item', 'Quantity', 'Unit Price', 'Total'],
      colWidths, ['left', 'right', 'right', 'right'],
      true
    )
    doc.moveDown(1)

    invoice.items.forEach((item) => {
      drawTableRow(
        doc, doc.y,
        [item.name, String(item.quantity),
         `GHS ${item.price.toFixed(2)}`, `GHS ${item.total.toFixed(2)}`],
        colWidths, ['left', 'right', 'right', 'right']
      )
      doc.moveDown(1.2)
    })

    doc.moveDown(0.5)
    doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.3)

    const totals = [
      { label: 'Subtotal', value: invoice.subtotal },
      { label: 'Discount', value: -invoice.discount, showIf: invoice.discount > 0 },
      { label: 'Tax', value: invoice.tax, showIf: invoice.tax > 0 },
    ]

    doc.fontSize(9).font('Helvetica')
    totals.forEach((t) => {
      if (t.showIf === false) return
      doc.text(t.label, 350, doc.y, { width: 100 })
      doc.text(`GHS ${Math.abs(t.value).toFixed(2)}`, { align: 'right', width: 195 })
      doc.moveDown(0.5)
    })

    doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.5)

    doc.fontSize(12).font('Helvetica-Bold')
    doc.text('Total:', 350, doc.y, { width: 100 })
    doc.text(`GHS ${invoice.total.toFixed(2)}`, { align: 'right', width: 195 })
    doc.moveDown(1)

    if (invoice.notes) {
      doc.fontSize(9).font('Helvetica-Bold').text('Notes:')
      doc.font('Helvetica').text(invoice.notes)
    }

    doc.moveDown(2)
    doc.fontSize(9).font('Helvetica').text(store.footer || 'Thank you for your business!', { align: 'center' })

    doc.end()
  })
}
