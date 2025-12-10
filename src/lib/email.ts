import nodemailer from 'nodemailer';

// Email configuration
const getTransporter = () => {
  // For production, use actual SMTP settings
  // For development, use ethereal.email or similar
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!user || !pass) {
    console.warn('[Email] SMTP credentials not configured. Emails will be logged to console.');
    return null;
  }
  
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, text, html } = options;
  
  // Get email addresses from environment
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@workreport.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'WorkReport';
  
  // Format: "Display Name" <email@domain.com>
  const from = `"${fromName}" <${fromEmail}>`;
  
  // No-reply address for Reply-To header (prevents replies)
  const replyTo = fromEmail;
  
  const transporter = getTransporter();
  
  if (!transporter) {
    // Log email content when SMTP is not configured
    console.log('\n========== EMAIL (Not Sent - SMTP Not Configured) ==========');
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`Reply-To: ${replyTo}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    if (html) {
      console.log(`HTML: ${html.substring(0, 200)}...`);
    }
    console.log('=============================================================\n');
    // Return false in production, true only in development
    return process.env.NODE_ENV === 'development';
  }
  
  try {
    await transporter.sendMail({
      from,
      to,
      replyTo,  // Users who click "Reply" will see this address
      subject,
      text,
      html: html || text,
      headers: {
        'X-Auto-Response-Suppress': 'All',  // Suppress auto-replies
        'Precedence': 'bulk',  // Indicates automated email
      },
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email for password change
export async function sendOTPEmail(email: string, otp: string, userName: string): Promise<boolean> {
  const subject = 'Password Change OTP - WorkReport';
  const text = `
Hello ${userName},

You have requested to change your password. Please use the following OTP to verify your identity:

OTP: ${otp}

This OTP is valid for 10 minutes. If you did not request this password change, please ignore this email.

Best regards,
WorkReport Team
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 24px; }
    .otp { font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f0f0f0; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
    .warning { color: #666; font-size: 14px; margin-top: 24px; }
    .footer { color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">WorkReport</div>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>You have requested to change your password. Please use the following OTP to verify your identity:</p>
    <div class="otp">${otp}</div>
    <p class="warning">This OTP is valid for <strong>10 minutes</strong>. If you did not request this password change, please ignore this email.</p>
    <div class="footer">
      Best regards,<br>
      WorkReport Team
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return sendEmail({ to: email, subject, text, html });
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  userName: string
): Promise<boolean> {
  // Get the base URL from environment or default to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const subject = 'Reset Your Password - WorkReport';
  const text = `
Hello ${userName},

You have requested to reset your password for your WorkReport account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
WorkReport Team
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
      background: #f5f5f5;
      margin: 0;
      padding: 40px 20px; 
    }
    .container { 
      max-width: 480px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 12px; 
      padding: 40px; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .logo { 
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: #0a0a0a;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: #0a0a0a;
    }
    h1 {
      color: #0a0a0a;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 20px 0;
    }
    p { 
      color: #525252; 
      font-size: 15px; 
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .button-container {
      text-align: center;
      margin: 28px 0;
    }
    .button { 
      display: inline-block;
      background: #0a0a0a;
      color: white !important; 
      padding: 14px 28px; 
      border-radius: 8px; 
      text-decoration: none; 
      font-weight: 600;
      font-size: 14px;
    }
    .link-box {
      background: #fafafa;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 20px 0;
      word-break: break-all;
      font-size: 13px;
      color: #0a0a0a;
      border: 1px solid #e5e5e5;
    }
    .info-box { 
      background: #fafafa;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 20px 0;
    }
    .info-box p {
      color: #525252;
      margin: 0;
      font-size: 13px;
    }
    .footer { 
      color: #a3a3a3; 
      font-size: 13px; 
      margin-top: 32px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e5e5;
      text-align: center;
    }
    .expires {
      display: inline-block;
      background: #fafafa;
      color: #525252;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e5e5e5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">W</div>
      <span class="logo-text">WorkReport</span>
    </div>
    
    <h1>Reset Your Password</h1>
    
    <p>Hello <strong>${userName}</strong>,</p>
    
    <p>We received a request to reset the password for your WorkReport account. Click the button below to create a new password:</p>
    
    <div class="button-container">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    
    <p style="font-size: 13px; color: #737373;">If the button doesn't work, copy and paste this link into your browser:</p>
    <div class="link-box">${resetUrl}</div>
    
    <p><span class="expires">Expires in 24 hours</span></p>
    
    <div class="info-box">
      <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    
    <div class="footer">
      <p>Best regards,<br><strong>WorkReport Team</strong></p>
      <p style="margin-top: 12px; font-size: 11px; color: #a3a3a3;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return sendEmail({ to: email, subject, text, html });
}

