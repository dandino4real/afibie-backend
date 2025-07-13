import { newAdminTemplate } from '../templates/newAdmin';
import { transporter } from '../utils/mailer';


export const sendNewAdminEmail = async (to: string, name: string, password: string) => {
  const html = newAdminTemplate(name, to, password);
  try {
      await transporter.sendMail({
        from: `"Afibie Admin" <${process.env.EMAIL_USER}>`,
        to,
        subject:  'Your Admin Account Has Been Created',
        html,
      });
      console.log("✅ Login email sent to", to);
    } catch (err) {
      console.error("❌ Failed to send login email:", err);
    }
};
