/**
 * @module lib/mail
 * @description Resend email transport and HTML template functions.
 * Templates use a light-themed responsive wrapper and embed the site logo.
 *
 * Exported templates:
 * - `approvalEmailHTML`  – access request approved (includes auto-fill login link)
 * - `denialEmailHTML`    – access request denied
 * - `contactReplyHTML`   – admin reply to a contact message
 * - `otpEmailHTML`       – one-time password for signup email verification
 * - `profileUpdateOtpHTML` – OTP for password / email change
 */
import { Resend } from "resend";

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL || "Acadex <noreply@send.au-acadex.com>";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Resend API key not configured - skipping email send.");
    return null;
  }

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

/* ───────────────────────────────────────────────────────────────
 *  Shared light-theme email wrapper (FamApp style)
 * ─────────────────────────────────────────────────────────────── */
function emailWrapper(body: string): string {
  const logoUrl = `${getAppUrl()}/site-logo.png`;

  return `
    <div style="margin: 0; padding: 0; background-color: #f5f5f5; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
              <!-- Logo -->
              <tr>
                <td style="padding: 0 0 12px 0; text-align: center;">
                  <img src="${logoUrl}" alt="Acadex" height="64" style="display: inline-block; height: 64px; width: auto;" />
                </td>
              </tr>
              <!-- Main card -->
              <tr>
                <td style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 32px 28px;">
                  ${body}
                  <!-- Sign-off -->
                  <p style="color: #111111; font-size: 14px; margin: 28px 0 0 0; font-weight: 700;">Best, Acadex.</p>
                </td>
              </tr>
              <!-- Disclaimer -->
              <tr>
                <td style="padding: 20px 4px 0 4px; text-align: center;">
                  <p style="color: #999999; font-size: 11px; line-height: 1.5; margin: 0;">
                    Disclaimer: Please do not share your Acadex OTP, credentials, or any confidential information with anyone, even if they claim to be from Acadex.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ── Approval email ── */
export function approvalEmailHTML(name: string, collegeId: string, tempPassword: string) {
  const loginUrl = `${getAppUrl()}/login?id=${encodeURIComponent(collegeId)}&p=${encodeURIComponent(tempPassword)}`;
  const body = `
    <p style="color: #333333; font-size: 15px; margin: 0 0 6px 0;">Hey <strong style="color: #111111;">${name}</strong>,</p>
    <p style="color: #555555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
      Your access request has been approved! Here are your login credentials:
    </p>
    <!-- Credentials table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 12px; margin: 0 0 20px 0;">
      <tr>
        <td style="padding: 14px 20px; border-bottom: 1px solid #e5e5e5;">
          <span style="color: #888888; font-size: 12px;">College ID</span>
        </td>
        <td style="padding: 14px 20px; border-bottom: 1px solid #e5e5e5; text-align: right;">
          <span style="color: #111111; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">${collegeId}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 20px;">
          <span style="color: #888888; font-size: 12px;">Temporary Password</span>
        </td>
        <td style="padding: 14px 20px; text-align: right;">
          <span style="color: #6366f1; font-size: 14px; font-weight: 700; letter-spacing: 2px; font-family: monospace;">${tempPassword}</span>
        </td>
      </tr>
    </table>
    <!-- Login button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td align="center">
          <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; letter-spacing: 0.3px;">Login to Acadex &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="color: #dc2626; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
      You will be required to change your password on first login.
    </p>
    <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.5;">
      If you have any questions, contact your class admin.
    </p>
  `;
  return emailWrapper(body);
}

/* ── Denial email ── */
export function denialEmailHTML(name: string, reason: string) {
  const reasonBlock = reason ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 10px 10px 0; padding: 16px 20px;">
          <p style="margin: 0 0 4px 0; color: #b91c1c; font-size: 12px; font-weight: 600;">Reason</p>
          <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">${reason}</p>
        </td>
      </tr>
    </table>
  ` : "";

  const body = `
    <p style="color: #333333; font-size: 15px; margin: 0 0 6px 0;">Hey <strong style="color: #111111;">${name}</strong>,</p>
    <p style="color: #555555; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
      Unfortunately, your access request for <strong style="color: #111111;">Acadex</strong> has been denied.
    </p>
    ${reasonBlock}
    <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.5;">
      If you believe this was a mistake, please contact your class admin for further assistance.
    </p>
  `;
  return emailWrapper(body);
}

/* ── Contact reply email ── */
export function contactReplyEmailHTML(
  name: string,
  subject: string,
  question: string,
  reply: string
) {
  const safeName = escapeHtml(name || "Student");
  const safeSubject = escapeHtml(subject || "Your message");
  const safeQuestion = escapeHtml(question || "(No question text available)");
  const safeReply = escapeHtml(reply || "");

  const body = `
    <p style="color: #333333; font-size: 15px; margin: 0 0 6px 0;">Hey <strong style="color: #111111;">${safeName}</strong>,</p>
    <p style="color: #555555; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
      Thank you for reaching out. Here is a complete copy of your conversation with admin regarding <strong style="color: #111111;">&ldquo;${safeSubject}&rdquo;</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 14px 0;">
      <tr>
        <td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 10px 10px 0; padding: 14px 18px;">
          <p style="margin: 0 0 6px 0; color: #1d4ed8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your question</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${safeQuestion}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 10px 10px 0; padding: 14px 18px;">
          <p style="margin: 0 0 6px 0; color: #15803d; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Admin reply</p>
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${safeReply}</p>
        </td>
      </tr>
    </table>
    <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.5;">
      If you have a follow-up question, feel free to reach out again through our contact page.
    </p>
  `;
  return emailWrapper(body);
}

/* ── OTP / verification email ── */
export function otpEmailHTML(name: string, otp: string, purpose: "password_change" | "email_change" | "forgot_password" | "signup_verification") {
  const purposeMap = {
    password_change: "change your password",
    email_change: "update your email address",
    forgot_password: "reset your password",
    signup_verification: "verify your email for account registration",
  };
  const purposeText = purposeMap[purpose];

  const body = `
    <p style="color: #333333; font-size: 15px; margin: 0 0 6px 0;">Hey <strong style="color: #111111;">${name}</strong>,</p>
    <p style="color: #555555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
      You requested to <strong style="color: #111111;">${purposeText}</strong>. Use the verification code below:
    </p>
    <!-- OTP box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center" style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px;">
          <p style="margin: 0 0 6px 0; color: #888888; font-size: 12px;">Your OTP Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #6366f1; letter-spacing: 8px; font-family: monospace;">${otp}</p>
        </td>
      </tr>
    </table>
    <p style="color: #dc2626; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
      This code expires in 10 minutes. Do not share it with anyone.
    </p>
    <p style="color: #888888; font-size: 13px; margin: 0; line-height: 1.5;">
      If you did not request this, you can safely ignore this email.
    </p>
  `;
  return emailWrapper(body);
}

/* ── Profile update (security) email ── */
export function profileUpdateEmailHTML(name: string, changeType: "password" | "email") {
  const changeText = changeType === "password" ? "password was changed" : "email address was updated";

  const body = `
    <p style="color: #333333; font-size: 15px; margin: 0 0 6px 0;">Hey <strong style="color: #111111;">${name}</strong>,</p>
    <p style="color: #555555; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
      Your <strong style="color: #111111;">${changeText}</strong> on Acadex.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
      <tr>
        <td style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 10px 10px 0; padding: 16px 20px;">
          <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
            If you did not make this change, please contact your admin immediately to secure your account.
          </p>
        </td>
      </tr>
    </table>
  `;
  return emailWrapper(body);
}
