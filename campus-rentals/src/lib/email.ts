// Server-only email helper (Resend). Centralizes the from-address, brand styling,
// and the base URL so individual routes don't re-implement transport details.
//
// Env:
//   RESEND_API_KEY     — required to actually send (absence is logged, not fatal)
//   EMAIL_FROM         — verified sender (default: Campus Rentals <noreply@campusrentalsllc.com>)
//   NEXT_PUBLIC_SITE_URL — public base URL for links in emails
import { Resend } from 'resend'

const ACCENT = '#54AAB1'

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com').replace(/\/$/, '')
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || 'Campus Rentals <noreply@campusrentalsllc.com>'
}

export interface EmailAttachment {
  filename: string
  content: Buffer | Uint8Array
}

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

/**
 * Send an email via Resend. Returns { ok, id?, error? }.
 * If RESEND_API_KEY is unset, logs and returns ok:false (callers should not leak
 * this to the client — a password-reset request must always look successful).
 */
export async function sendEmail({ to, subject, html, replyTo, attachments }: SendEmailArgs): Promise<{
  ok: boolean
  id?: string
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set — email not sent:', subject)
    return { ok: false, error: 'Email service not configured' }
  }
  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments && attachments.length
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })) }
        : {}),
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: typeof error === 'string' ? error : 'Send failed' }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error('[email] send threw:', e)
    return { ok: false, error: 'Send failed' }
  }
}

/** Minimal branded wrapper so transactional emails share one look. */
export function brandedEmail(opts: { heading: string; bodyHtml: string; cta?: { label: string; url: string } }): string {
  const { heading, bodyHtml, cta } = opts
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
    <div style="padding: 24px 0; border-bottom: 3px solid ${ACCENT};">
      <span style="font-size: 18px; font-weight: 700; color: #111827;">Campus Rentals</span>
    </div>
    <div style="padding: 28px 0;">
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #111827;">${heading}</h1>
      <div style="font-size: 15px; line-height: 1.6; color: #374151;">${bodyHtml}</div>
      ${
        cta
          ? `<div style="margin: 28px 0;">
               <a href="${cta.url}" style="display: inline-block; background: ${ACCENT}; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 22px; border-radius: 10px;">${cta.label}</a>
             </div>
             <p style="font-size: 13px; color: #6b7280; word-break: break-all;">Or paste this link into your browser:<br>${cta.url}</p>`
          : ''
      }
    </div>
    <div style="padding: 18px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
      Campus Rentals LLC · This is an automated message from the investor portal.
    </div>
  </div>`
}

/** Compose + send the password-reset email. */
export async function sendPasswordResetEmail(to: string, token: string): Promise<{ ok: boolean }> {
  const url = `${siteUrl()}/investors/reset-password?token=${encodeURIComponent(token)}`
  const html = brandedEmail({
    heading: 'Reset your password',
    bodyHtml:
      'We received a request to reset the password for your Campus Rentals investor account. ' +
      'This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.',
    cta: { label: 'Reset password', url },
  })
  const res = await sendEmail({ to, subject: 'Reset your Campus Rentals password', html })
  return { ok: res.ok }
}

const usd0 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

/** Invite a new investor to set up their portal account. */
export async function sendInviteEmail(
  to: string,
  opts: { token: string; firstName?: string; inviterName?: string }
): Promise<{ ok: boolean }> {
  const url = `${siteUrl()}/investors/accept-invite?token=${encodeURIComponent(opts.token)}`
  const html = brandedEmail({
    heading: 'You’re invited to the Campus Rentals investor portal',
    bodyHtml:
      `${opts.firstName ? `Hello ${opts.firstName},<br><br>` : ''}` +
      `${opts.inviterName ? `${opts.inviterName} has invited you` : 'You have been invited'} to the ` +
      `Campus Rentals investor portal, where you can view your capital account, distributions, ` +
      `statements, and documents. Click below to set your password and get started. This invite expires in 7 days.`,
    cta: { label: 'Accept invitation', url },
  })
  const res = await sendEmail({ to, subject: 'Your Campus Rentals investor portal invitation', html })
  return { ok: res.ok }
}

/** Notify an investor that their K-1 (or other tax document) is available. */
export async function sendK1ReadyEmail(
  to: string,
  opts: { investorName?: string; year: number }
): Promise<{ ok: boolean }> {
  const html = brandedEmail({
    heading: `Your ${opts.year} K-1 is ready`,
    bodyHtml:
      `${opts.investorName ? `Hello ${opts.investorName},<br><br>` : ''}` +
      `Your Schedule K-1 for tax year <strong>${opts.year}</strong> has been posted to your ` +
      `investor portal. It is available only to you. Please consult your tax advisor with any questions.`,
    cta: { label: 'View my documents', url: `${siteUrl()}/investors/documents` },
  })
  const res = await sendEmail({ to, subject: `Your ${opts.year} Campus Rentals K-1 is available`, html })
  return { ok: res.ok }
}

/** Notify an investor that a capital call has been issued for one of their deals. */
export async function sendCapitalCallEmail(
  to: string,
  opts: { investorName?: string; dealName: string; amountCalled: number; dueDate?: Date | string | null }
): Promise<{ ok: boolean }> {
  const due = opts.dueDate
    ? new Date(opts.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const html = brandedEmail({
    heading: 'A capital call has been issued',
    bodyHtml:
      `${opts.investorName ? `Hello ${opts.investorName},<br><br>` : ''}` +
      `A capital call of <strong>${usd0(opts.amountCalled)}</strong> has been issued for ` +
      `<strong>${opts.dealName}</strong>${due ? `, due by ${due}` : ''}. ` +
      `Please review and acknowledge it in your portal.`,
    cta: { label: 'Review capital call', url: `${siteUrl()}/investors/capital-calls` },
  })
  const res = await sendEmail({ to, subject: `Capital call — ${opts.dealName}`, html })
  return { ok: res.ok }
}

/** Notify an investor that a distribution has been recorded for one of their deals. */
export async function sendDistributionNoticeEmail(
  to: string,
  opts: { investorName?: string; propertyName: string; amount: number; date: Date | string; note?: string }
): Promise<{ ok: boolean }> {
  const when = new Date(opts.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const html = brandedEmail({
    heading: 'A distribution has been recorded',
    bodyHtml:
      `${opts.investorName ? `Hello ${opts.investorName},<br><br>` : ''}` +
      `A distribution of <strong>${usd0(opts.amount)}</strong> has been recorded for ` +
      `<strong>${opts.propertyName}</strong>, dated ${when}.` +
      `${opts.note ? `<br><br>${opts.note}` : ''}` +
      `<br><br>You can review the detail in your capital account at any time.`,
    cta: { label: 'View my capital account', url: `${siteUrl()}/investors/capital-account` },
  })
  const res = await sendEmail({ to, subject: `Distribution recorded — ${opts.propertyName}`, html })
  return { ok: res.ok }
}

/** Deliver a quarterly capital-account statement (branded email + attached PDF). */
export async function sendStatementEmail(
  to: string,
  opts: { investorName?: string; periodLabel: string; pdf: Buffer | Uint8Array }
): Promise<{ ok: boolean }> {
  const html = brandedEmail({
    heading: `Your ${opts.periodLabel} capital account statement`,
    bodyHtml:
      `${opts.investorName ? `Hello ${opts.investorName},<br><br>` : ''}` +
      `Your capital account statement for <strong>${opts.periodLabel}</strong> is attached as a PDF. ` +
      `You can also view your live position any time in the investor portal.`,
    cta: { label: 'Open the investor portal', url: `${siteUrl()}/investors/capital-account` },
  })
  const filename = `campus-rentals-statement-${opts.periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`
  const res = await sendEmail({
    to,
    subject: `Campus Rentals — ${opts.periodLabel} statement`,
    html,
    attachments: [{ filename, content: opts.pdf }],
  })
  return { ok: res.ok }
}
