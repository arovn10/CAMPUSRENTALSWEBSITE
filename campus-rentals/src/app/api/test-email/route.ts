import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_fFBTYGAf_3bwSSSr1xV8jLkPA8vwnUydz');

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'rovnerproperties@gmail.com',
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