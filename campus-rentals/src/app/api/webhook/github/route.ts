import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// GitHub webhook secret (you'll need to set this in your GitHub repository)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // Verify webhook signature for security
    if (signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex')}`;
      
      if (signature !== expectedSignature) {
        console.error('Webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
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
    
    return NextResponse.json({ 
      message: 'Auto-deployment triggered successfully',
      output: stdout,
      errors: stderr || null
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