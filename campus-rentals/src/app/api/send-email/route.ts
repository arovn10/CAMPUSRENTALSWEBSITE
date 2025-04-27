import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_fFBTYGAf_3bwSSSr1xV8jLkPA8vwnUydz');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { to, from, subject, text } = body;

    if (!to || !from || !subject || !text) {
      console.error('Missing required fields:', { to, from, subject, text });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: to,
      replyTo: from,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${text.split('\n')[0].replace('Name: ', '')}</p>
          <p><strong>Email:</strong> ${text.split('\n')[1].replace('Email: ', '')}</p>
          <p><strong>Phone:</strong> ${text.split('\n')[2].replace('Phone: ', '')}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${text.split('\n')[3].replace('Message: ', '')}
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 