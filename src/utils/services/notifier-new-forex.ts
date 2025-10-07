import { IFOREX_User } from "../../models/new-forex_user.model";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const adminBot = new Telegraf(process.env.NEW_BOT_TOKEN_FOREX!);
const adminChannelId = process.env.TELEGRAM_ADMIN_CHANNEL_ID!;

export async function sendAdminAlertForex(user: IFOREX_User) {
  const message = `
🆕 <b>New Forex User Registration</b>

👤 <b>Name:</b> ${user.fullName || "N/A"}
📛 <b>Username:</b> @${user.username || "N/A"}
🆔 <b>Telegram ID:</b> ${user.telegramId}
🌍 <b>Country:</b> ${user.country || "N/A"}
🏦 <b>Broker:</b> ${user.broker || "N/A"}
🔑 <b>Login ID:</b> ${user.loginId || "N/A"}

⏳ <b>Status:</b> Pending Approval
`;

  try {
    await adminBot.telegram.sendMessage(adminChannelId, message, {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("❌ Failed to notify admin:", err);
  }
}
