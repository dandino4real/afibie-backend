
import { loginNotificationTemplate } from "../templates/loginNotification";
import { transporter } from "../utils/mailer";

export const sendLoginNotification = async (to: string, name: string, location: string, ip: string) => {
  const html = loginNotificationTemplate(name, location, ip);
   try {
    await transporter.sendMail({
      from: `"Afibie Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'New Admin Login Detected',
      html,
    });
    console.log("✅ Login email sent to", to);
  } catch (err) {
    console.error("❌ Failed to send login email:", err);
  }
};
