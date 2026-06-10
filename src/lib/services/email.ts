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

export async function sendInvoiceEmail(params: {
  to: string
  customerName: string
  invoiceNumber: string
  invoiceUrl: string
  total: number
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice #${params.invoiceNumber}</h2>
      <p>Hi ${params.customerName},</p>
      <p>Your invoice for <strong>${params.total.toFixed(2)}</strong> is ready.</p>
      <p>
        <a href="${params.invoiceUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
