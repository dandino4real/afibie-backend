import { IAfibe10X_User } from '../../models/afibe10x_user.model';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const adminBot = new Telegraf(process.env.BOT_TOKEN_AFIBIE_10X!)


const adminChannelId = process.env.TELEGRAM_ADMIN_CHANNEL_ID!;

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
