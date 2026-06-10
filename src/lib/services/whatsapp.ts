interface WhatsAppPayload {
  type: 'receipt' | 'invoice'
  storeName: string
  number: string
  total: number
  currency: string
  url: string
  dueDate?: string
}

export function generateWhatsAppLink(payload: WhatsAppPayload): string {
  const { type, storeName, number, total, currency, url, dueDate } = payload
  let message = ''

  if (type === 'receipt') {
    message = [
      `🧾 *${storeName}*`,
      `Receipt #${number}`,
      `Total: ${currency}${total.toFixed(2)}`,
      `View: ${url}`,
      '',
      'Thank you for your purchase!',
    ].join('\n')
  } else {
    message = [
      `📄 *${storeName}*`,
      `Invoice #${number}`,
      `Amount: ${currency}${total.toFixed(2)}`,
      `Due: ${dueDate || 'N/A'}`,
      `View/Pay: ${url}`,
    ].join('\n')
  }

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
