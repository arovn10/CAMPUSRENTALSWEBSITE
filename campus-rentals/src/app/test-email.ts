import { Resend } from 'resend';

const resend = new Resend('re_fFBTYGAf_3bwSSSr1xV8jLkPA8vwnUydz');

async function sendTestEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'rovnerproperties@gmail.com',
      subject: 'Test Email from Campus Rentals',
      html: '<p>This is a test email from the Campus Rentals website!</p>'
    });

    if (error) {
      console.error('Error sending email:', error);
      return;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

sendTestEmail(); 