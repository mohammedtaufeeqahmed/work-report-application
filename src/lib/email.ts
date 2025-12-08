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
    // Log email content in development when SMTP is not configured
    console.log('\n========== EMAIL (Not Sent - SMTP Not Configured) ==========');
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`Reply-To: ${replyTo}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log('=============================================================\n');
    return true; // Return true in dev mode so the flow continues
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

