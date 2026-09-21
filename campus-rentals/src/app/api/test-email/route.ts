import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// The key is supplied by the environment (see .env on the host) — never committed to the repo.
// Constructed inside the handler, not at module scope: the Resend SDK throws on
// an empty key, and at module scope that throw happens while Next collects page
// data at BUILD time, breaking `npm run build` on any machine without the key —
// including the PR Build Check. Matches src/lib/email.ts and /api/send-email.

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service is not configured' }, { status: 503 });
  }
  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'arovner@campusrentalsllc.com',
      subject: 'Test Email from Campus Rentals',
      html: '<p>This is a test email from the Campus Rentals website!</p>'
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
} 