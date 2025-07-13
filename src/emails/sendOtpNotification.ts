import { otpTemplate } from '../templates/otpTemplate';
import { transporter } from '../utils/mailer';

export const sendOTPEmail = async (to: string, name: string, otp: string) => {
  const html = otpTemplate(name, otp);
  try {
    await transporter.sendMail({
      from: `"Afibie Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your Password Reset OTP',
      html,
    });
    console.log(`✅ OTP email sent successfully to ${to} at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${to}:`, err);
    throw err; 
  }
};