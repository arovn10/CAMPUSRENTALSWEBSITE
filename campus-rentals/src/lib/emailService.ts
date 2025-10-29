import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
  templateId?: string
  variables?: Record<string, any>
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    // Disabled eager initialization for now; initialize lazily on first send
  }

  private async initializeTransporter() {
    try {
      // Get email configuration from system settings
      const settings = await prisma.systemSettings.findMany({
        where: {
          key: {
            in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE']
          }
        }
      })

      const config: EmailConfig = {
        host: settings.find(s => s.key === 'SMTP_HOST')?.value || 'smtp.gmail.com',
        port: parseInt(settings.find(s => s.key === 'SMTP_PORT')?.value || '587'),
        secure: settings.find(s => s.key === 'SMTP_SECURE')?.value === 'true',
        auth: {
          user: settings.find(s => s.key === 'SMTP_USER')?.value || '',
          pass: settings.find(s => s.key === 'SMTP_PASS')?.value || ''
        }
      }

      // Lazily create transporter; use nodemailer.createTransport
      this.transporter = nodemailer.createTransport(config as any)

      // Verify connection
      await this.transporter.verify()
      console.log('Email service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize email service:', error)
      this.transporter = null
    }
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    // If email is disabled, short-circuit successfully (no-op)
    if (!this.transporter) {
      console.warn('Email service disabled: skipping actual send')
      // Optionally log a stub email record
      try {
        await prisma.emailLog.create({
          data: {
            to: data.to,
            from: await this.getFromEmail(),
            subject: data.subject,
            templateId: data.templateId,
            status: 'SENT',
            sentAt: new Date(),
            metadata: { skipped: true, variables: data.variables }
          }
        })
      } catch {}
      return true
    }

    try {
      const fromEmail = await this.getFromEmail()
      
      const mailOptions = {
        from: fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text
      }

      const result = await this.transporter.sendMail(mailOptions)

      // Log email
      await prisma.emailLog.create({
        data: {
          to: data.to,
          from: fromEmail,
          subject: data.subject,
          templateId: data.templateId,
          status: 'SENT',
          sentAt: new Date(),
          metadata: {
            messageId: result.messageId,
            variables: data.variables
          }
        }
      })

      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      
      // Log failed email
      await prisma.emailLog.create({
        data: {
          to: data.to,
          from: await this.getFromEmail(),
          subject: data.subject,
          templateId: data.templateId,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: { variables: data.variables }
        }
      })

      return false
    }
  }

  async sendTemplateEmail(templateName: string, to: string, variables: Record<string, any> = {}): Promise<boolean> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { name: templateName }
      })

      if (!template) {
        throw new Error(`Email template '${templateName}' not found`)
      }

      if (!template.isActive) {
        throw new Error(`Email template '${templateName}' is not active`)
      }

      // Replace variables in template
      let htmlContent = template.htmlContent
      let textContent = template.textContent
      let subject = template.subject

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value))
        if (textContent) {
          textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value))
        }
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
      })

      return await this.sendEmail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
        templateId: template.id,
        variables
      })
    } catch (error) {
      console.error('Failed to send template email:', error)
      return false
    }
  }

  async sendWelcomeEmail(userEmail: string, firstName: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    
    return await this.sendTemplateEmail('welcome', userEmail, {
      firstName,
      verificationUrl,
      appName: 'Campus Rentals LLC',
      supportEmail: await this.getSupportEmail()
    })
  }

  async sendPasswordResetEmail(userEmail: string, firstName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    
    return await this.sendTemplateEmail('password_reset', userEmail, {
      firstName,
      resetUrl,
      appName: 'Campus Rentals LLC',
      supportEmail: await this.getSupportEmail()
    })
  }

  async sendEmailVerificationEmail(userEmail: string, firstName: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    
    return await this.sendTemplateEmail('email_verification', userEmail, {
      firstName,
      verificationUrl,
      appName: 'Campus Rentals LLC',
      supportEmail: await this.getSupportEmail()
    })
  }

  async sendInvestmentNotificationEmail(userEmail: string, firstName: string, propertyName: string, amount: number): Promise<boolean> {
    return await this.sendTemplateEmail('investment_notification', userEmail, {
      firstName,
      propertyName,
      amount: amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      appName: 'Campus Rentals LLC',
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/investors/dashboard`
    })
  }

  async sendDistributionNotificationEmail(userEmail: string, firstName: string, propertyName: string, amount: number, distributionType: string): Promise<boolean> {
    return await this.sendTemplateEmail('distribution_notification', userEmail, {
      firstName,
      propertyName,
      amount: amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      distributionType,
      appName: 'Campus Rentals LLC',
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/investors/dashboard`
    })
  }

  private async getFromEmail(): Promise<string> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'FROM_EMAIL' }
    })
    return setting?.value || 'noreply@campusrentals.cc'
  }

  private async getSupportEmail(): Promise<string> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'SUPPORT_EMAIL' }
    })
    return setting?.value || 'support@campusrentals.cc'
  }

  async createDefaultEmailTemplates(): Promise<void> {
    const templates = [
      {
        name: 'welcome',
        subject: 'Welcome to {{appName}} - Verify Your Email',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to {{appName}}!</h1>
              </div>
              <div class="content">
                <h2>Hello {{firstName}},</h2>
                <p>Thank you for joining {{appName}}. We're excited to have you as part of our investment community.</p>
                <p>To get started, please verify your email address by clicking the button below:</p>
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
                <p>If you have any questions, please contact us at {{supportEmail}}.</p>
                <p>Best regards,<br>The {{appName}} Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{to}}. If you didn't create an account, please ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Welcome to {{appName}}!
          
          Hello {{firstName}},
          
          Thank you for joining {{appName}}. We're excited to have you as part of our investment community.
          
          To get started, please verify your email address by visiting this link:
          {{verificationUrl}}
          
          If you have any questions, please contact us at {{supportEmail}}.
          
          Best regards,
          The {{appName}} Team
        `
      },
      {
        name: 'password_reset',
        subject: 'Reset Your {{appName}} Password',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hello {{firstName}},</h2>
                <p>We received a request to reset your password for your {{appName}} account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{{resetUrl}}" class="button">Reset Password</a>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
                <div class="warning">
                  <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email and contact us at {{supportEmail}}.
                </div>
                <p>Best regards,<br>The {{appName}} Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{to}}. If you didn't request a password reset, please ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Password Reset Request - {{appName}}
          
          Hello {{firstName}},
          
          We received a request to reset your password for your {{appName}} account.
          
          To reset your password, visit this link:
          {{resetUrl}}
          
          This link will expire in 1 hour for your security.
          
          If you didn't request this password reset, please ignore this email and contact us at {{supportEmail}}.
          
          Best regards,
          The {{appName}} Team
        `
      },
      {
        name: 'email_verification',
        subject: 'Verify Your Email Address - {{appName}}',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #00b894; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verify Your Email</h1>
              </div>
              <div class="content">
                <h2>Hello {{firstName}},</h2>
                <p>Please verify your email address to complete your {{appName}} account setup.</p>
                <p>Click the button below to verify your email:</p>
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you have any questions, please contact us at {{supportEmail}}.</p>
                <p>Best regards,<br>The {{appName}} Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{to}}. If you didn't create an account, please ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Email Verification - {{appName}}
          
          Hello {{firstName}},
          
          Please verify your email address to complete your {{appName}} account setup.
          
          To verify your email, visit this link:
          {{verificationUrl}}
          
          This verification link will expire in 24 hours.
          
          If you have any questions, please contact us at {{supportEmail}}.
          
          Best regards,
          The {{appName}} Team
        `
      },
      {
        name: 'investment_notification',
        subject: 'New Investment Opportunity - {{appName}}',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Investment - {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .highlight { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Investment Opportunity</h1>
              </div>
              <div class="content">
                <h2>Hello {{firstName}},</h2>
                <p>We have a new investment opportunity available for you:</p>
                <div class="highlight">
                  <h3>{{propertyName}}</h3>
                  <p><strong>Investment Amount:</strong> {{amount}}</p>
                </div>
                <p>Log in to your dashboard to view full details and make your investment decision.</p>
                <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
                <p>If you have any questions, please contact us at {{supportEmail}}.</p>
                <p>Best regards,<br>The {{appName}} Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{to}}. You can manage your notification preferences in your account settings.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          New Investment Opportunity - {{appName}}
          
          Hello {{firstName}},
          
          We have a new investment opportunity available for you:
          
          Property: {{propertyName}}
          Investment Amount: {{amount}}
          
          Log in to your dashboard to view full details and make your investment decision.
          {{dashboardUrl}}
          
          If you have any questions, please contact us at {{supportEmail}}.
          
          Best regards,
          The {{appName}} Team
        `
      },
      {
        name: 'distribution_notification',
        subject: 'Distribution Payment - {{appName}}',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Distribution Payment - {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #00b894; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .highlight { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Distribution Payment</h1>
              </div>
              <div class="content">
                <h2>Hello {{firstName}},</h2>
                <p>Great news! A distribution payment has been processed for your investment:</p>
                <div class="highlight">
                  <h3>{{propertyName}}</h3>
                  <p><strong>Distribution Type:</strong> {{distributionType}}</p>
                  <p><strong>Amount:</strong> {{amount}}</p>
                </div>
                <p>This payment should appear in your account within 1-3 business days.</p>
                <a href="{{dashboardUrl}}" class="button">View Dashboard</a>
                <p>If you have any questions about this distribution, please contact us at {{supportEmail}}.</p>
                <p>Best regards,<br>The {{appName}} Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{to}}. You can manage your notification preferences in your account settings.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Distribution Payment - {{appName}}
          
          Hello {{firstName}},
          
          Great news! A distribution payment has been processed for your investment:
          
          Property: {{propertyName}}
          Distribution Type: {{distributionType}}
          Amount: {{amount}}
          
          This payment should appear in your account within 1-3 business days.
          
          View your dashboard: {{dashboardUrl}}
          
          If you have any questions about this distribution, please contact us at {{supportEmail}}.
          
          Best regards,
          The {{appName}} Team
        `
      }
    ]

    for (const template of templates) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template
      })
    }
  }

  async initializeDefaultSettings(): Promise<void> {
    const settings = [
      { key: 'SMTP_HOST', value: 'smtp.gmail.com', description: 'SMTP server host', category: 'email' },
      { key: 'SMTP_PORT', value: '587', description: 'SMTP server port', category: 'email' },
      { key: 'SMTP_SECURE', value: 'false', description: 'Use secure SMTP connection', category: 'email' },
      { key: 'SMTP_USER', value: '', description: 'SMTP username', category: 'email', isEncrypted: true },
      { key: 'SMTP_PASS', value: '', description: 'SMTP password', category: 'email', isEncrypted: true },
      { key: 'FROM_EMAIL', value: 'noreply@campusrentals.cc', description: 'Default from email address', category: 'email' },
      { key: 'SUPPORT_EMAIL', value: 'support@campusrentals.cc', description: 'Support email address', category: 'email' },
      { key: 'APP_NAME', value: 'Campus Rentals LLC', description: 'Application name', category: 'general' },
      { key: 'APP_URL', value: 'https://campusrentals.cc', description: 'Application URL', category: 'general' }
    ]

    for (const setting of settings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting
      })
    }
  }
}

export const emailService = new EmailService()
