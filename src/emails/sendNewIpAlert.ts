
import { newLocationAlertTemplate } from "../templates/newIpAlert";
import { transporter } from "../utils/mailer";

export const sendNewLocationAlert = async (
  to: string,
  name: string,
  previousLocation: string,
  currentLocation: string,
  ip: string
) => {
  const html = newLocationAlertTemplate(name, previousLocation, currentLocation, ip);
try {
    await transporter.sendMail({
      from: `"Afibie Security" <${process.env.EMAIL_USER}>`,
      to,
      subject:  'Unusual Login Location Alert',
      html,
    });
    console.log("✅ Login email sent to", to);
  } catch (err) {
    console.error("❌ Failed to send login email:", err);
  }

};
