import { wrapEmailContent } from './wrapper';

export const otpTemplate = (name: string, otp: string) =>
  wrapEmailContent(`
    <h2>Password Reset OTP</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>You requested a password reset for your Afibie admin account. Use the following one-time password (OTP) to proceed:</p>
    <div style="text-align: center; margin: 20px 0;">
      <span style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 2px;">${otp}</span>
    </div>
    <p>This OTP is valid for <strong>10 minutes</strong>. Enter it in the verification form to continue.</p>
    <p>If you didn’t request this, please ignore this email or contact support.</p>
  `);