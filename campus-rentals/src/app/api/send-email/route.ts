import { NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * Contact-form mail. Three things were wrong here before 2026-09-04:
 *
 *  1. It had never delivered. The host had no RESEND_API_KEY, so every submission returned
 *     500 "Email service is not configured" and the lead was lost.
 *  2. The RECIPIENT came from the request body, so anyone could POST this endpoint and send mail
 *     from the Campus Rentals account to any address they liked. The destination is now server-side
 *     only; the submitter's address is used strictly as Reply-To.
 *  3. Submitted text was interpolated into HTML unescaped.
 *
 * Sender/recipient are environment-driven so that verifying the domain in Resend is a config change,
 * not a code change:
 *   CONTACT_TO           where leads go            (default: arovner@campusrentalsllc.com)
 *   CONTACT_FROM         the From: address         (default: onboarding@resend.dev, Resend's shared
 *                                                   sender — usable only until the domain is verified)
 *   CONTACT_FALLBACK_TO  last-resort recipient     (default: the Resend account owner)
 *
 * Until campusrentalsllc.com is verified at resend.com/domains, Resend refuses any recipient other
 * than the account owner. Rather than drop the lead, we retry once to the fallback address and say so
 * loudly in the logs. A lead that arrives in the wrong inbox is recoverable; one that vanishes is not.
 */

const CONTACT_TO = process.env.CONTACT_TO || 'arovner@campusrentalsllc.com';
const CONTACT_FROM = process.env.CONTACT_FROM || 'onboarding@resend.dev';
const CONTACT_FALLBACK_TO = process.env.CONTACT_FALLBACK_TO || '';

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Pull "Label: value" lines out of the form's plain-text body, order-independently. */
function field(text: string, label: string): string {
  const m = String(text || '').match(new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, 'im'));
  return m ? m[1].trim() : '';
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[contact] RESEND_API_KEY is not set — the form cannot deliver');
      return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = await request.json();
    const { from, subject, text } = body ?? {};

    if (!from || !subject || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // The submitter's address is only ever a Reply-To, so a malformed one must not reach Resend.
    const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(from).trim()) ? String(from).trim() : undefined;

    const name = field(text, 'Name');
    const email = field(text, 'Email') || replyTo || '';
    const phone = field(text, 'Phone');
    const message = field(text, 'Message') || String(text);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${escapeHtml(message).replace(/\n/g, '<br>')}
          </div>
        </div>
      `;

    const send = (to: string, subjectLine: string) =>
      resend.emails.send({ from: CONTACT_FROM, to, reply_to: replyTo, subject: subjectLine, html });

    let { data, error } = await send(CONTACT_TO, subject);

    if (error && CONTACT_FALLBACK_TO && CONTACT_FALLBACK_TO !== CONTACT_TO) {
      console.error(
        `[contact] delivery to ${CONTACT_TO} was refused (${(error as { message?: string })?.message ?? 'unknown'}). ` +
          `Retrying to ${CONTACT_FALLBACK_TO}. Verify campusrentalsllc.com at resend.com/domains to stop this.`
      );
      ({ data, error } = await send(CONTACT_FALLBACK_TO, `[via fallback] ${subject}`));
    }

    if (error) {
      console.error('[contact] Resend refused the message:', error);
      return NextResponse.json({ error: 'Could not send your message. Please email us directly.' }, { status: 502 });
    }

    console.log('[contact] delivered', { id: (data as { id?: string })?.id });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[contact] server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
