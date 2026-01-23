import { IAfibe10X_User } from '../../models/afibe10x_user.model';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const adminBot = new Telegraf(process.env.BOT_TOKEN_AFIBIE_10X || process.env.BOT_TOKEN_CRYPTO!);
// Fallback to crypto token if 10x token isn't set, but ideally use the specific one. 
// Ideally, the admin bot should be the same bot instance or a dedicated admin bot. 
// In cryptoBot, it uses BOT_TOKEN_CRYPTO to send messages to TELEGRAM_ADMIN_CHANNEL_ID.
// I will assume we use the new bot token to send messages to the admin channel.

const adminChannelId = process.env.AFIBE_10X_CHANNEL_ID || process.env.TELEGRAM_ADMIN_CHANNEL_ID!;

export async function sendAdminAlertAfibe10X(user: IAfibe10X_User) {
    const message = `
🆕 New User Registration Request (Afibe 10X)
👤 Username: @${user.username || 'N/A'}
📌 Name: ${user.fullName || 'N/A'}
💼 WEEX UID: ${user.userId || 'N/A'}
  `;

    try {
        await adminBot.telegram.sendMessage(adminChannelId, message);
    } catch (err) {
        console.error('Failed to notify admin for Afibe 10X:', err);
    }
}
