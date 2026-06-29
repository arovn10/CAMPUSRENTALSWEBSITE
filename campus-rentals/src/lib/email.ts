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

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send an email via Resend. Returns { ok, id?, error? }.
 * If RESEND_API_KEY is unset, logs and returns ok:false (callers should not leak
 * this to the client — a password-reset request must always look successful).
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailArgs): Promise<{
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
