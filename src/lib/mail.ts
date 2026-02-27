import nodemailer from "nodemailer";

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials not configured — skipping email send.");
    return null;
  }

  const info = await transporter.sendMail({
    from: `"Acadex" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info;
}

export function approvalEmailHTML(name: string, collegeId: string, tempPassword: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <img src="${getAppUrl()}/images/logo.png" alt="Acadex" width="48" height="48" style="display: block; margin: 0 auto 8px auto;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Acadex</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Account Access Granted</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">Welcome, ${name}! 🎉</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Your access request for <strong>Acadex</strong> has been approved! Here are your login credentials:
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">College ID</p>
          <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1f2937; letter-spacing: 1px;">${collegeId}</p>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Temporary Password</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #6366f1; letter-spacing: 2px; font-family: monospace;">${tempPassword}</p>
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 600;">
          ⚠️ You will be required to change your password on first login.
        </p>
        <p style="color: #4b5563; line-height: 1.6; margin-top: 16px;">
          If you have any questions, contact your class admin.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Acadex &bull; Engineered by Mr Techie
        </p>
      </div>
    </div>
  `;
}

export function denialEmailHTML(name: string, reason: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <img src="${getAppUrl()}/images/logo.png" alt="Acadex" width="48" height="48" style="display: block; margin: 0 auto 8px auto;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Acadex</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Access Request Update</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">Hi ${name},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Unfortunately, your access request for <strong>Acadex</strong> has been denied.
        </p>
        ${reason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 13px; font-weight: 600;">Reason:</p>
          <p style="margin: 0; color: #7f1d1d;">${reason}</p>
        </div>` : ""}
        <p style="color: #4b5563; line-height: 1.6;">
          If you believe this was a mistake, please contact your class admin for further assistance.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Acadex &bull; Engineered by Mr Techie
        </p>
      </div>
    </div>
  `;
}

export function contactReplyEmailHTML(name: string, subject: string, reply: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <img src="${getAppUrl()}/images/logo.png" alt="Acadex" width="48" height="48" style="display: block; margin: 0 auto 8px auto;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Acadex</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Reply to Your Message</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">Hi ${name},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Thank you for reaching out! The admin has responded to your message regarding <strong>"${subject}"</strong>:
        </p>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 12px 12px 0; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; line-height: 1.7; white-space: pre-wrap;">${reply}</p>
        </div>
        <p style="color: #4b5563; line-height: 1.6;">
          If you have a follow-up question, feel free to reach out again through our contact page.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Acadex &bull; Engineered by Mr Techie
        </p>
      </div>
    </div>
  `;
}

export function otpEmailHTML(name: string, otp: string, purpose: "password_change" | "email_change" | "forgot_password" | "signup_verification") {
  const purposeMap = {
    password_change: "change your password",
    email_change: "update your email address",
    forgot_password: "reset your password",
    signup_verification: "verify your email for account registration",
  };
  const purposeText = purposeMap[purpose];
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <img src="${getAppUrl()}/images/logo.png" alt="Acadex" width="48" height="48" style="display: block; margin: 0 auto 8px auto;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Acadex</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Verification Code</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">Hi ${name},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          You requested to <strong>${purposeText}</strong>. Use the verification code below to proceed:
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Your OTP Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #6366f1; letter-spacing: 8px; font-family: monospace;">${otp}</p>
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 600;">
          ⚠️ This code expires in 10 minutes. Do not share it with anyone.
        </p>
        <p style="color: #4b5563; line-height: 1.6; margin-top: 16px;">
          If you did not request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Acadex &bull; Engineered by Mr Techie
        </p>
      </div>
    </div>
  `;
}

export function profileUpdateEmailHTML(name: string, changeType: "password" | "email") {
  const changeText = changeType === "password" ? "password was changed" : "email address was updated";
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <img src="${getAppUrl()}/images/logo.png" alt="Acadex" width="48" height="48" style="display: block; margin: 0 auto 8px auto;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Acadex</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Security Alert</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">Hi ${name},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Your <strong>${changeText}</strong> on Acadex.
        </p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ⚠️ If you did not make this change, please contact your admin immediately to secure your account.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          Acadex &bull; Engineered by Mr Techie
        </p>
      </div>
    </div>
  `;
}
