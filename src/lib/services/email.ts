import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: 'IndFlow <noreply@indflow.com>',
    to,
    subject,
    html,
  })
}

/**
 * Minimal HTML-escape for user-supplied strings interpolated into email
 * bodies. Customer names, invoice numbers, and total amounts all come from
 * the database (which is itself fed by user input on the public-facing
 * form). Without escaping, a malicious customer named
 * `<img src=x onerror=alert(1)>` would execute script in the recipient's
 * mail preview. Resend does not sandbox HTML, so escaping at the boundary
 * is the correct defense.
 *
 * Escape order matters: & first, otherwise the other replacements would
 * be re-escaped.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendInvoiceEmail(params: {
  to: string
  customerName: string
  invoiceNumber: string
  invoiceUrl: string
  total: number
}) {
  const safeName = escapeHtml(params.customerName)
  const safeInvoiceNumber = escapeHtml(params.invoiceNumber)
  const safeTotal = escapeHtml(params.total.toFixed(2))
  const safeUrl = escapeHtml(params.invoiceUrl)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice #${safeInvoiceNumber}</h2>
      <p>Hi ${safeName},</p>
      <p>Your invoice for <strong>${safeTotal}</strong> is ready.</p>
      <p>
        <a href="${safeUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Invoice
        </a>
      </p>
      <p>Thank you for your business!</p>
    </div>
  `

  await sendEmail({
    to: params.to,
    subject: `Invoice #${params.invoiceNumber} from IndFlow`,
    html,
  })
}
