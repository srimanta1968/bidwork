import sgMail from '@sendgrid/mail';
import { config } from '../config/env';

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send email verification code via SendGrid
 */
export async function sendVerificationEmail(to: string, code: string, firstName: string): Promise<boolean> {
  try {
    if (!config.sendgrid.apiKey) {
      console.warn('SendGrid API key not configured — skipping email send');
      return false;
    }

    const msg = {
      to,
      from: {
        email: config.sendgrid.fromEmail,
        name: config.sendgrid.fromName,
      },
      subject: 'Verify your BidWork account',
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; font-weight: 800; font-size: 20px; line-height: 48px;">B</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 16px 0 0;">BidWork</h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Hi ${firstName},</h2>
          <p style="font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px;">
            Welcome to BidWork! Please use the verification code below to confirm your email address.
          </p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
            This code expires in 15 minutes. If you didn't create a BidWork account, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
            &copy; ${new Date().getFullYear()} BidWork. The operating system for home services execution.
          </p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send a Select & Notify offer email to a contractor whose bid the homeowner has approved.
 * Uses BidWork's branded From address — the owner's contact info is intentionally not exposed.
 */
export async function sendSelectAndNotifyEmail(params: {
  to: string;
  contractorFirstName: string;
  projectTitle: string;
  bidAmount: number;
  acceptDeadlineHours: number;
  acceptUrl: string;
}): Promise<boolean> {
  try {
    if (!config.sendgrid.apiKey) {
      console.warn('SendGrid API key not configured — skipping select-notify email');
      return false;
    }
    const msg = {
      to: params.to,
      from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
      subject: `You've been selected: ${params.projectTitle}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; font-weight: 800; font-size: 20px; line-height: 48px;">B</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 16px 0 0;">BidWork</h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Hi ${params.contractorFirstName},</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 16px;">
            Great news — the homeowner has selected your bid for <strong>${params.projectTitle}</strong>.
          </p>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <p style="font-size: 13px; font-weight: 600; color: #047857; margin-bottom: 4px;">YOUR BID</p>
            <p style="font-size: 28px; font-weight: 800; color: #047857;">$${params.bidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Please log in to BidWork and click <strong>Accept Offer</strong> within <strong>${params.acceptDeadlineHours} working hours</strong> to claim this engagement and start the contract flow. If you don't respond in time, the homeowner will be prompted to promote the next-ranked bidder.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${params.acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none;">Review &amp; Accept Offer</a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
            For privacy, the homeowner's contact details are released only after the contract is mutually signed. Please use BidWork to communicate until then.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
            &copy; ${new Date().getFullYear()} BidWork. The operating system for home services execution.
          </p>
        </div>
      `,
    };
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid select-notify email error:', error);
    return false;
  }
}

export const emailService = {
  generateVerificationCode,
  sendVerificationEmail,
  sendSelectAndNotifyEmail,
};
