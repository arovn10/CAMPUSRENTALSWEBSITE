import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// The key is supplied by the environment (see .env on the host) — never committed to the repo.
const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service is not configured' }, { status: 503 });
  }
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