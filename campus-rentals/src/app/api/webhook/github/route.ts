import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// GitHub webhook secret — must be configured; no insecure default.
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Fail closed if the secret isn't configured — never run a deploy unverified.
    if (!WEBHOOK_SECRET) {
      console.error('GITHUB_WEBHOOK_SECRET is not set; rejecting webhook');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Signature is REQUIRED. A missing header previously skipped verification entirely,
    // which let anyone trigger the deploy script (effectively unauthenticated RCE).
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex')}`;

    // Constant-time comparison to avoid leaking the signature via timing.
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    
    // Only process push events to main branch
    if (payload.ref !== 'refs/heads/main') {
      return NextResponse.json({ message: 'Ignored - not main branch' });
    }
    
    console.log('🚀 GitHub webhook received - starting auto-deployment...');
    
    // Execute deployment script
    const deploymentScript = `
      cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
      chmod +x auto-deploy.sh
      ./auto-deploy.sh
    `;
    
    const { stdout, stderr } = await execAsync(deploymentScript);
    
    console.log('Deployment output:', stdout);
    if (stderr) {
      console.error('Deployment errors:', stderr);
    }

    // Don't echo deploy stdout/stderr back to the caller — it leaks server paths and
    // command output. Log it server-side (above); return only a status.
    return NextResponse.json({
      message: 'Auto-deployment triggered successfully'
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook testing)
export async function GET() {
  return NextResponse.json({ 
    message: 'GitHub webhook endpoint is active',
    instructions: 'Configure this URL in your GitHub repository webhooks'
  });
} 