import { ICRYPTO_User } from '../../models/crypto_user.model';
import { Telegraf } from 'telegraf';

import dotenv from 'dotenv';
dotenv.config();


const adminBot = new Telegraf(process.env.BOT_TOKEN_CRYPTO!); 
const adminChannelId = process.env.TELEGRAM_ADMIN_CHANNEL_ID!;


export async function sendAdminAlertCrypto(user: ICRYPTO_User) {
  const message = `
🆕 New User Registration Request (Crypto)
👤 Username: @${user.username}
📌 Name: ${user.fullName}
🌍 Country: ${user.country}
💼 Bybit UID: ${user.bybitUid || 'N/A'}
💼 Blofin UID: ${user.blofinUid || 'N/A'}
🕒 Status: Pending Approval
  `;

  try {
    await adminBot.telegram.sendMessage(adminChannelId, message);
    // console.log(message)
  } catch (err) {
    console.error('Failed to notify admin:', err);
  }
}
