
// import { Telegraf, Markup } from "telegraf";
// import rateLimit from "telegraf-ratelimit";
// import cloudinary from "../config/cloudinary";
// import Fuse from "fuse.js";
// import { BotContext } from "../telegrafContext";
// import {
//   groupACountries,
//   groupBCountries,
//   groupCCountries,
//   groupDcountries,
// } from "./constant";
// import { FOREX_User, IFOREX_User } from "../models/new-forex_user.model";
// import { sendAdminAlertForex } from "../utils/services/notifier-new-forex";
// import Redis from "ioredis";

// import dotenv from "dotenv";

// dotenv.config({
//   path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
// });

// const GROUP_CHAT_ID = process.env.FOREX_GROUP_CHAT_ID;
// const EXNESS_LINK = process.env.EXNESS_LINK || "https://exness.com";
// const AXI_LINK = process.env.AXI_LINK || "https://axi.com";
// const EXCO_LINK = process.env.EXCO_TRADER_LINK || "https://exco.com";
// const OANDO_LINK = process.env.MT4_ALL_LINK || "https://oanda.com";

// console.log({
//   GROUP_CHAT_ID,
//   EXNESS_LINK,
//   AXI_LINK,
//   EXCO_LINK,
//   OANDO_LINK,
// })

// let redis: Redis;
// try {
//   redis =
//     process.env.NODE_ENV === "production"
//       ? new Redis(process.env.REDIS_URL!)
//       : new Redis();
//   console.log("✅ Redis connected");
// } catch (err) {
//   console.error("❌ Redis connection error:", err);
// }

// export default function (bot: Telegraf<BotContext>) {
//   console.log("💬 forexBot_New file loaded");

//   // ---------------- COUNTRY GROUPS ----------------
//   const allCountries = [
//     ...groupACountries,
//     ...groupBCountries,
//     ...groupCCountries,
//     ...groupDcountries,
//   ];
//   const fuse = new Fuse(allCountries, { threshold: 0.3 });

//   // -------------------- REDIS SESSION MIDDLEWARE --------------------
//   bot.use(async (ctx, next) => {
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) return next();

//     const sessionKey = `forex:${telegramId}`;
//     const sessionData = await redis.get(sessionKey);
//     if (!sessionData) {
//       ctx.session = { step: "welcome", botType: "forex_new", retryCount: 0 };
//       await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
//     } else {
//       ctx.session = JSON.parse(sessionData);
//     }

//     return next();
//   });

//   // ---------------- Notify user after approval or rejection after admin review on loginId ----------------

//   async function notifyUserApproved(user: IFOREX_User) {
//     const message = `
// ✅ <b>Approved</b>

// Thanks for waiting

// We confirmed that you used the recommended link and have made the minimum deposit.  

// 🎉 Congratulations! The next step is to make sure your account is set up correctly for trading.
// `;

//     try {
//       await bot.telegram.sendMessage(user.telegramId, message, {
//         parse_mode: "HTML",
//         reply_markup: Markup.inlineKeyboard([
//           [Markup.button.callback("Continue", "mt4_setup")],
//         ]).reply_markup,
//       });
//     } catch (err) {
//       console.error("❌ Failed to notify user (approved):", err);
//     }
//   }


// async function notifyUserRejected(user: IFOREX_User, reason: string) {
//   let message = "";
//   let buttonText = "";
//   let callbackData = "";

//   const predefinedReasons = [
//     "deposit_missing",
//     "deposit_incomplete",
//     "duplicate_id",
//     "wrong_link",
//     "demo_account",
//   ];

//   const isCustom = !predefinedReasons.includes(reason);

//   // 🟡 Handle custom reason
//   if (isCustom || reason === "other") {
//     message = `
// Thanks for waiting

// ❌ <b>Your Login ID was rejected</b>

// <b>Reason:</b> ${reason || "Unspecified issue"}

// Please correct this issue and <b>click the button below</b> to resubmit your Login ID.
// `;
//     buttonText = "🔄 Click to Retry Submission";
//     callbackData = "broker_done";
//   }

//   // 🟠 Deposit Missing
//   else if (reason === "deposit_missing") {
//     message = `
// Thanks for waiting

// ❌ <b>Rejected – Deposit Missing</b>

// We confirmed that you used the recommended link but have not made the required minimum deposit.  

// ⚠️ Please make your deposit first, then <b>click the button below</b> to resubmit your Login ID.  
// (One last chance; repeated unfunded resubmits = permanent block.)
// `;
//     buttonText = "💰 Click to ReSubmit";
//     callbackData = "broker_done";
//   }

//   // 🟢 Deposit Incomplete
//   else if (reason === "deposit_incomplete") {
//     message = `
// Thanks for waiting

// ❌ <b>Rejected – Incomplete Deposit</b>

// Your deposit amount does not meet the required minimum.  

// Please fund your account with at least <b>$160</b>, then <b>click the button below</b> to resubmit your Login ID.
// `;
//     buttonText = "💵 Click to ReSubmit After Funding";
//     callbackData = "broker_done";
//   }

//   // 🔵 Duplicate ID
//   else if (reason === "duplicate_id") {
//     message = `
// Thanks for waiting

// ❌ <b>Rejected – Duplicate Login ID</b>

// The Login ID you provided is already associated with another user. 

// Please double-check your broker account and <b>click the button below</b> to resubmit the correct Login ID.
// `;
//     buttonText = "🔄 Click to ReSubmit Login ID";
//     callbackData = "broker_done";
//   }

//   // 🟣 Demo Account
//   else if (reason === "demo_account") {
//     message = `
//  Thanks for waiting
    
// ❌ <b>Rejected – Demo Account Detected</b>

// It seems the account you provided is a <b>demo</b> account.  

// Please submit a <b>live</b> trading account Login ID</b> and <b>click the button below</b> to continue.
// `;
//     buttonText = "🎯 Click to Submit Live Account";
//     callbackData = "broker_done";
//   }

//   // 🔴 Wrong Link
//   else if (reason === "wrong_link") {
//     let brokerLink = "";
//     switch (user.broker) {
//       case "Exness":
//         brokerLink = EXNESS_LINK || "https://exness.com";
//         break;
//       case "AXI":
//         brokerLink = AXI_LINK || "https://axi.com";
//         break;
//       case "Exco":
//         brokerLink = EXCO_LINK || "https://exco.com";
//         break;
//       case "Oanda":
//         brokerLink = OANDO_LINK || "https://oanda.com";
//         break;
//       default:
//         brokerLink = process.env.BROKER_LINK || "https://defaultbroker.com";
//     }

//     message = `
//  Thanks for waiting 

// ❌ <b>Rejected – Wrong Registration Link</b>

// Your Login ID is not found in our record, which means you did not register using the correct link.  

// 👉 Please register again using the correct link below, make your deposit, then <b>click the button below</b> to confirm.

// <a href="${brokerLink}">${user.broker} Registration Link</a>
// `;
//     buttonText = "🔗 Click After Registering";
//     callbackData = "retry_broker";
//   }

//   // ✅ Send message
//   try {
//     await bot.telegram.sendMessage(user.telegramId, message, {
//       parse_mode: "HTML",
//       reply_markup: Markup.inlineKeyboard([
//         [Markup.button.callback(buttonText, callbackData)],
//       ]).reply_markup,
//     });
//   } catch (err) {
//     console.error("❌ Failed to notify user (rejected):", err);
//   }
// }

//   // ---------------- notify user after mt4/mt5 screenshot upload ----------------

//   // ✅ APPROVED
//   async function notifyUserScreenshotApproved(user: IFOREX_User) {
//     try {
//       await bot.telegram.sendMessage(
//         user.telegramId,
//         `Thanks for waiting\n\n✅ Your screenshot has been approved!\n\nClick the button below to continue to the final step.`,
//         {
//           reply_markup: {
//             inline_keyboard: [
//               [{ text: "➡️ Continue", callback_data: "continue_test_trades" }],
//             ],
//           },
//         }
//       );
//     } catch (err) {
//       console.error("❌ Failed to notify user about screenshot approval:", err);
//     }
//   }

  
//   async function notifyUserScreenshotRejected(user: IFOREX_User, reason: string) {
//   try {
//     const readableReason = reason || "Unspecified";

//     await bot.telegram.sendMessage(
//       user.telegramId,
//       `Thanks for waiting\n\n❌ <b>Your screenshot was rejected.</b>\n\n<b>Reason:</b> ${readableReason}\n\nPlease upload a new screenshot to continue.`,
//       {
//         parse_mode: "HTML",
//         reply_markup: {
//           inline_keyboard: [
//             [
//               {
//                 text: "🔄 Retry Screenshot Upload",
//                 callback_data: "retry_screenshot_upload",
//               },
//             ],
//           ],
//         },
//       }
//     );
//   } catch (err) {
//     console.error("❌ Failed to notify user about screenshot rejection:", err);
//   }
// }


//   // ================== NOTIFY USER: TEST TRADE SCREENSHOT APPROVED ==================
//   async function notifyUserTestTradeScreenshotApproved(user: IFOREX_User) {
//     try {
//       await bot.telegram.sendMessage(
//         user.telegramId,
//         `Thanks for waiting\n\n✅ Your Test Trades screenshot has been approved! 🎉\n\n` +

//           `Please click <b>Continue</b> below to move forward with the final onboarding steps.`,
//         {
//           parse_mode: "HTML",
//           reply_markup: {
//             inline_keyboard: [
//               [
//                 {
//                   text: "➡️ Continue",
//                   callback_data: "continue_final_onboarding",
//                 },
//               ],
//             ],
//           },
//         }
//       );
//     } catch (err) {
//       console.error(
//         "❌ Failed to notify user about Test Trades screenshot approval:",
//         err
//       );
//     }
//   }

//   // ================== NOTIFY USER: TEST TRADE SCREENSHOT REJECTED ==================

// async function notifyUserTestTradeScreenshotRejected(user: IFOREX_User, reason: string) {
//   try {
//     const readableReason = reason || "Unspecified";

//     const message = `
// Thanks for waiting

// ❌ <b>Your Test Trades screenshot was rejected</b>

// <b>Reason:</b> ${readableReason}

// 👉 Please click the button below to <b>Resubmit Screenshot</b>.
// `;

//     await bot.telegram.sendMessage(user.telegramId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [
//             {
//               text: "📸 Resubmit Screenshot",
//               callback_data: "resubmit_test_trades",
//             },
//           ],
//         ],
//       },
//     });
//   } catch (err) {
//     console.error("❌ Failed to notify user about Test Trades screenshot rejection:", err);
//   }
// }


//   // ---------------- WATCH FOR STATUS CHANGES IN MONGODB ----------------
//   async function watchUserStatusChanges() {
//     try {
//       const changeStream = FOREX_User.watch([], {
//         fullDocument: "updateLookup",
//       });

//       changeStream.on("change", async (change) => {
//         if (
//           change.operationType === "update" &&
//           change.updateDescription.updatedFields
//         ) {
//           const updated = change.updateDescription.updatedFields;
//           const user = change.fullDocument as IFOREX_User;

//           // ✅ Login ID
//           if (updated.loginId_status === "approved") {
//             await notifyUserApproved(user);
//           }

//           if (updated.loginId_status === "rejected") {
//              const reason =
//             user.loginId_customRejectionReason ||
//             user.loginId_rejectionReason ||
//             "Unspecified";
//             await notifyUserRejected(user, reason);
//           }

//           // ✅ First Screenshot
//           if (updated.screenshotUrl_status === "approved") {
//             await notifyUserScreenshotApproved(user);
//           }

//           if (updated.screenshotUrl_status === "rejected") {

//             const reason =
//             user.screenshotUrl_customRejectionReason ||
//             user.screenshotUrl_rejectionReason ||
//             "Unspecified";

//           await notifyUserScreenshotRejected(user, reason);
//           }

//           // ✅ Test Trades Screenshot
//           if (updated.testTradesScreenshotUrl_status === "approved") {
//             await notifyUserTestTradeScreenshotApproved(user);
//           }

//           if (updated.testTradesScreenshotUrl_status === "rejected") {
//               const reason =
//             user.testTradesScreenshotUrl_customRejectionReason ||
//             user.testTradesScreenshotUrl_rejectionReason ||
//             "Unspecified";

//           await notifyUserTestTradeScreenshotRejected(user, reason);
//           }
//         }
//       });
//     } catch (error) {
//       console.error(
//         "[watchUserStatusChanges] Error setting up change stream:",
//         error
//       );
//     }
//   }

//   // ---------------- START ----------------
//   bot.start(async (ctx) => {
//     ctx.session.step = "welcome";
//     await redis.set(
//       `forex:${ctx.from?.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//     await ctx.replyWithHTML(
//       `👋 Hey <b>${ctx.from?.first_name || "there"}</b>,\n\n` +
//         `Welcome – and congratulations on taking the first real step toward consistent profits with our premium forex signals.\n\n` +
//         `This bot will walk you through the process step by step. After answering a few quick questions, you’ll be connected to me and my team for verification.\n\n` +
//         `👉 If you’re ready, click Continue.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Continue", callback_data: "continue_to_captcha" }],
//           ],
//         },
//       }
//     );
//   });

//   // ---------------- CAPTCHA ----------------
//   bot.action("continue_to_captcha", async (ctx) => {
//     const captcha = Math.floor(10000 + Math.random() * 90000).toString();
//     ctx.session.captcha = captcha;
//     ctx.session.step = "captcha";

//     await redis.set(
//       `forex:${ctx.from?.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );

//     await ctx.replyWithHTML(
//       `<b>🔐 Captcha Verification</b>\n\nPlease type this code:\n<code>${captcha}</code>`
//     );
//   });

//   // ---------------- HANDLE TEXT ----------------
//   bot.on("text", async (ctx) => {
//     const text = ctx.message.text.trim();
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) return;

//     // ✅ Captcha verification
//     if (ctx.session.step === "captcha") {
//       if (text === ctx.session.captcha) {
//         ctx.session.step = "country";
//         await redis.set(
//           `forex:${telegramId}`,
//           JSON.stringify(ctx.session),
//           "EX",
//           86400
//         );
//         await ctx.replyWithHTML(
//           `🌍 <b>Country Check</b>\n\n` +
//             `📌 <i>What is your country?</i>\n\n` +
//             `✍️ Type your country name so I know how best to help you.`
//         );
//       } else {
//         const captcha = Math.floor(10000 + Math.random() * 90000).toString();
//         ctx.session.captcha = captcha;
//         await redis.set(
//           `forex:${telegramId}`,
//           JSON.stringify(ctx.session),
//           "EX",
//           86400
//         );
//         await ctx.replyWithHTML(
//           `❌ Wrong captcha.\nTry again: <code>${captcha}</code>`
//         );
//       }
//       return;
//     }

//     // ✅ Country detection (Fuse.js)
//     if (ctx.session.step === "country") {
//       const result = fuse.search(text);
//       if (result.length === 0) {
//         // await ctx.reply(`❌ Couldn’t recognize "${text}". Try again.`);
//         await handleCountry(ctx, text);

//         return;
//       }

//       const bestMatch = result[0].item;
//       if (bestMatch.toLowerCase() !== text.toLowerCase()) {
//         await ctx.replyWithHTML(
//           `✍️ Did you mean <b>${bestMatch}</b>?`,
//           Markup.inlineKeyboard([
//             Markup.button.callback(
//               `✅ Yes, ${bestMatch}`,
//               `confirm_country:${bestMatch}`
//             ),
//             Markup.button.callback("❌ No", "retry_country"),
//           ])
//         );
//       } else {
//         await handleCountry(ctx, bestMatch);
//       }
//       return;
//     }

//     // ✅ Login ID validation (5–8 digits only)
//     if (ctx.session.awaitingLoginId) {
//       if (/^\d{5,8}$/.test(text)) {
//         ctx.session.loginId = text;
//         ctx.session.awaitingLoginId = false;

//         ctx.session.step = "screenshot";
//         await redis.set(
//           `forex:${telegramId}`,
//           JSON.stringify(ctx.session),
//           "EX",
//           86400
//         );

//         await ctx.replyWithHTML(
//           `✅ Thank you. We’ve received your <b>Login ID</b>.\n\n` +
//             `⏳ <i>Review Process:</i>\n` +
//             `⏳ <i>We are verifying your account… it might take several minutes.</i>`
//         );

//         // --- Save or Update User in MongoDB ---
//         try {
//           const telegramId = ctx.from?.id.toString();

//           if (!telegramId) {
//             await ctx.reply(
//               "⚠️ Could not determine your Telegram ID. Please restart the bot."
//             );
//             return;
//           }

//           const existingUser = await FOREX_User.findOne({ telegramId });

//           if (existingUser) {
//             // Update existing user
//             existingUser.username = ctx.from?.username;
//             existingUser.fullName = `${ctx.from?.first_name || ""} ${
//               ctx.from?.last_name || ""
//             }`.trim();
//             existingUser.country = ctx.session.country || "";
//             existingUser.broker = ctx.session.broker || "";
//             existingUser.loginId = ctx.session.loginId || "";
//             existingUser.loginId_status = "awaiting_approval";
//             existingUser.updatedAt = new Date();

//             await existingUser.save();
//             console.log("🔄 Forex user updated:", existingUser);

//             // Notify admin of update (optional)
//             await sendAdminAlertForex(existingUser);
//           } else {
//             // Create new user
//             const newUser = new FOREX_User({
//               telegramId,
//               username: ctx.from?.username,
//               fullName: `${ctx.from?.first_name || ""} ${
//                 ctx.from?.last_name || ""
//               }`.trim(),
//               country: ctx.session.country,
//               broker: ctx.session.broker,
//               loginId: ctx.session.loginId,
//             });

//             await newUser.save();
//             console.log("✅ New forex user created:", newUser);

//             // Notify admin of new registration
//             await sendAdminAlertForex(newUser);
//           }
//         } catch (err) {
//           console.error("❌ Failed to save or update forex user:", err);
//           await ctx.reply(
//             "⚠️ An error occurred while saving your details. Please try again later."
//           );
//         }

       
//       } else {
//         await ctx.replyWithHTML(
//           `❌ Invalid Login ID format.\n\n` +
//             `👉 Please send only the <b>numbers</b> from your broker’s welcome email (5–8 digits).`
//         );
//       }
//       return;
//     }
//   });

//   // ---------------- COUNTRY CONFIRM ----------------
//   bot.action(/confirm_country:(.+)/, async (ctx) => {
//     await handleCountry(ctx, ctx.match[1]);
//   });

//   bot.action("retry_country", async (ctx) => {
//     await ctx.reply("🌍 Please type your country again.");
//   });

//   // ---------------- HELPER FUNCTION ----------------
//   async function handleCountry(ctx: BotContext, country: string) {
//     ctx.session.country = country;
//     let group: string;

//     if (groupACountries.includes(country)) group = "A";
//     else if (groupBCountries.includes(country)) group = "B";
//     else if (groupCCountries.includes(country)) group = "C";
//     else if (groupDcountries.includes(country)) group = "D";
//     else group = "B";

//     ctx.session.group = group;

//     // ---------------- GROUP A ----------------
//     if (group === "A") {
//       ctx.session.step = "broker"; // <--- add this

//       const telegramId = ctx.from?.id?.toString();
//       if (!telegramId) {
//         console.error("❌ ctx.from is undefined. Cannot save session.");
//         return;
//       }
//       await redis.set(
//         `forex:${telegramId}`,
//         JSON.stringify(ctx.session),
//         "EX",
//         86400
//       );
//       await ctx.replyWithHTML(
//         `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nDo you already have an Exness account?`,
//         Markup.inlineKeyboard([
//           Markup.button.callback("✅ Yes", "groupA_yes"),
//           Markup.button.callback("❌ No", "groupA_no"),
//         ])
//       );
//     }

//     // ---------------- GROUP B ----------------
//     else if (group === "B") {
//       ctx.session.broker = "AXI";
//       ctx.session.step = "broker";

//       const telegramId = ctx.from?.id?.toString();
//       if (!telegramId) {
//         console.error("❌ ctx.from is undefined. Cannot save session.");
//         return;
//       }
//       await redis.set(
//         `forex:${telegramId}`,
//         JSON.stringify(ctx.session),
//         "EX",
//         86400
//       );

//       await ctx.replyWithHTML(
//         `Ok Great 👍 \n\n 🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nOur recommended broker is <b>AXI</b>.\n\n👉 Register here: <a href="${AXI_LINK}">AXI Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//         {
//           link_preview_options: { is_disabled: true },
//           reply_markup: {
//             inline_keyboard: [
//               [{ text: "✅ Done", callback_data: "broker_done" }],
//             ],
//           },
//         }
//       );
//     }

//     // ---------------- GROUP C ----------------
//     else if (group === "C") {
//       ctx.session.broker = "Oanda";
//       ctx.session.step = "broker";
//       const telegramId = ctx.from?.id?.toString();
//       if (!telegramId) {
//         console.error("❌ ctx.from is undefined. Cannot save session.");
//         return;
//       }
//       await redis.set(
//         `forex:${telegramId}`,
//         JSON.stringify(ctx.session),
//         "EX",
//         86400
//       );

//       await ctx.replyWithHTML(
//         `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nOur recommended broker is <b>Oanda</b>.\n\n👉 Register here: <a href="${OANDO_LINK}">Oanda Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//         {
//           link_preview_options: { is_disabled: true },
//           reply_markup: {
//             inline_keyboard: [
//               [{ text: "✅ Done", callback_data: "broker_done" }],
//             ],
//           },
//         }
//       );
//     }

//     // ---------------- GROUP D ----------------
//     else if (group === "D") {
//       ctx.session.broker = "Exness";
//       ctx.session.step = "broker"; // <--- add this
//       const telegramId = ctx.from?.id?.toString();
//       if (!telegramId) {
//         console.error("❌ ctx.from is undefined. Cannot save session.");
//         return;
//       }
//       await redis.set(
//         `forex:${telegramId}`,
//         JSON.stringify(ctx.session),
//         "EX",
//         86400
//       );

//       await ctx.replyWithHTML(
//         `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nDo you already have an Exness account?`,
//         Markup.inlineKeyboard([
//           Markup.button.callback("✅ Yes", "groupD_yes"),
//           Markup.button.callback("❌ No", "groupD_no"),
//         ])
//       );
//     }
//   }

//   // ---------------- BROKER FLOW ----------------
//   bot.action("groupA_no", async (ctx) => {
//     ctx.session.broker = "Exness";
//     ctx.session.step = "broker"; // <--- add this
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }
//     await redis.set(
//       `forex:${telegramId}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );

//     await ctx.replyWithHTML(
//       `Ok Great 👍 \n\n ❌ <b>Register with Exness</b> 👉 <a href="${EXNESS_LINK}">Exness Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Done", callback_data: "broker_done" }],
//           ],
//         },
//       }
//     );
//   });

//   bot.action("groupA_yes", async (ctx) => {
//     ctx.session.broker = "AXI";
//     ctx.session.step = "broker";
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }
//     await redis.set(
//       `forex:${telegramId}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//     await ctx.replyWithHTML(
//       `Ok Great 👍  \n\n ✅ <b>Register with AXI</b> 👉 <a href="${AXI_LINK}">AXI Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Done", callback_data: "broker_done" }],
//           ],
//         },
//       }
//     );
//   });

//   // ---------------- GROUP D – YES / NO ----------------
//   bot.action("groupD_no", async (ctx) => {
//     ctx.session.broker = "Exness";
//     ctx.session.step = "broker";
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }
//     await redis.set(
//       `forex:${telegramId}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//     await ctx.replyWithHTML(
//       `Ok Great 👍  \n\n ❌ <b>Register with Exness</b> 👉 <a href="${EXNESS_LINK}">Exness Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Done", callback_data: "broker_done" }],
//           ],
//         },
//       }
//     );
//   });

//   bot.action("groupD_yes", async (ctx) => {
//     ctx.session.broker = "Exco";
//     ctx.session.step = "broker";
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }
//     await redis.set(
//       `forex:${telegramId}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//     await ctx.replyWithHTML(
//       `Ok Great 👍  \n\n ✅ <b>Register with Exco</b> 👉 <a href="${EXCO_LINK}">Exco Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Done", callback_data: "broker_done" }],
//           ],
//         },
//       }
//     );
//   });

  

//   bot.action("broker_done", async (ctx) => {
//   try {
//     // Always attempt to acknowledge callback, but ignore stale ones
//     try {
//       await ctx.answerCbQuery();
//     } catch (err: any) {
//       if (
//         err.description?.includes("query is too old") ||
//         err.description?.includes("query ID is invalid")
//       ) {
//         console.warn("⚠️ Ignored stale callback query for broker_done");
//       } else {
//         console.error("⚠️ Error answering callback query:", err);
//       }
//     }

//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }

//     await ctx.replyWithHTML(
//       `<b> Deposit Requirement and Verification</b>\n\n` +
//         `✅ Verify your account and make a minimum deposit of <b>$160</b>.\n\n` +
//         `💡 However, I Recommended minimum deposit of:\n` +
//         `▫️ <b>$300</b> for solid risk management on normal trades\n` +
//         `▫️ <b>$500</b> if you plan to trade our <b>Gold Signals</b> safely\n\n` +
//         `👉 Once Funded, send me your <b>Login ID</b> for Verification\n\n` +
//         `⚠️ <b>Do not send your password.</b>\n\n` +
//         `⚠️ <b>You can watch the video below for a video guide 👇</b>`
//     );

//     // 🔹 Send broker-specific video if available
//     let videoFileId: string | undefined;
//     switch (ctx.session.broker) {
//       case "Exness":
//         videoFileId = process.env.EXNESS_VIDEO_FILE_ID;
//         break;
//       case "AXI":
//         videoFileId = process.env.AXI_VIDEO_FILE_ID;
//         break;
//       case "Exco":
//         videoFileId = process.env.EXCO_VIDEO_FILE_ID;
//         break;
//       case "Oanda":
//         videoFileId = process.env.MT4_ALL_VIDEO_FILE_ID;
//         break;
//     }

//     if (videoFileId && ctx.chat) {
//       try {
//         await ctx.telegram.sendVideo(ctx.chat.id, videoFileId, {
//           caption: "Here’s how to find your Login ID",
//         });
//       } catch (err) {
//         await ctx.replyWithHTML(
//           `⚠️ <i>Video guide unavailable at the moment.</i>\n` +
//             `Please check your broker’s welcome email for instructions.`
//         );
//       }
//     }

//     ctx.session.awaitingLoginId = true;
//     ctx.session.step = "awaitingLoginId";
//     await redis.set(
//       `forex:${telegramId}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//   } catch (err) {
//     console.error("❌ Error in broker_done handler:", err);
//   }
// });


//   // ----------------RETRY BROKER FOR WRONG LINK ----------------

//   bot.action("retry_broker", async (ctx) => {
//     // Use broker from session if available
//     const broker = ctx.session?.broker || "your broker";
//     let brokerLink = "";

//     switch (broker) {
//       case "Exness":
//         brokerLink = EXNESS_LINK || "https://exness.com";
//         break;
//       case "AXI":
//         brokerLink = AXI_LINK || "https://axi.com";
//         break;
//       case "Exco":
//         brokerLink = EXCO_LINK || "https://exco.com";
//         break;
//       case "Oanda":
//         brokerLink = OANDO_LINK || "https://oanda.com";
//         break;
//       default:
//         brokerLink = process.env.BROKER_LINK || "https://defaultbroker.com";
//     }

//     await ctx.replyWithHTML(
//       `⚠️ Please register again using the correct link:\n\n` +
//         `<a href="${brokerLink}">${broker} Link</a>\n\n` +
//         `👉 Once you have registered and deposited, click <b>Done</b>.`,
//       {
//         link_preview_options: { is_disabled: true },
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "✅ Done", callback_data: "broker_done" }],
//           ],
//         },
//       }
//     );
//   });

//   // ---------------- HANDLE MT4/MT5 SETUP FLOW ----------------

//   bot.action("mt4_setup", async (ctx) => {
//     await ctx.answerCbQuery();
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) {
//       console.error("❌ ctx.from is undefined. Cannot save session.");
//       return;
//     }

//     const setupMessage = `
// <b>📊 Setting Up Your Trading Platform</b>

// 1️⃣ Check your email for broker login credentials (Account Number, Password, and Server).  
// 2️⃣ Download MT4/MT5:  

// 🔹 MT4 iPhone: <a href="https://apps.apple.com/ph/app/metatrader-4/id496212596">Download MT4 iOS</a>  
// 🔹 MT4 Android: <a href="https://play.google.com/store/search?q=mt4&c=apps">Download MT4 Android</a>  
// 🔹 MT5 iPhone: <a href="https://apps.apple.com/ph/app/metatrader-5/id413251709">Download MT5 iOS</a>  
// 🔹 MT5 Android: <a href="https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5">Download MT5 Android</a>  

// 3️⃣ Log in to your account – use the credentials from the email (make sure it’s a LIVE account).  

// 4️⃣ Once logged in, <b>please send me a screenshot of your MT4/MT5 account</b> to confirm setup.

// 📹 Watch the broker-specific video guide below.  
// 💡 If you run into any trouble, I’ll assist you step by step.
// `;

//     // Fetch user from DB (assuming you saved telegramId in session)
//     const user = await FOREX_User.findOne({ telegramId: ctx.from.id });

//     if (!user) {
//       await ctx.reply("❌ Could not find your registration details.");
//       return;
//     }

//     // Map broker → video file ID
//     const brokerVideos: Record<string, string | undefined> = {
//       axi: process.env.MT4_AXI_VIDEO_FILE_ID,
//       exness: process.env.MT4_EXNESS_VIDEO_FILE_ID,
//       exco: process.env.MT4_EXCO_VIDEO_FILE_ID,
//       oanda: process.env.MT4_OANDA_VIDEO_FILE_ID,
//     };

//     const brokerKey = user.broker?.toLowerCase();
//     const videoFileId = brokerVideos[brokerKey];

//     // Send setup message
//     await ctx.replyWithHTML(setupMessage, {
//       link_preview_options: { is_disabled: true },
//     });

//     // Send the video only if found for broker
//     if (videoFileId) {
//       await ctx.replyWithVideo(videoFileId, {
//         caption: `🎥 MT4/MT5 Setup Guide for ${user.broker}`,
//       });
//     } else {
//       await ctx.reply("⚠️ No video guide available for your broker yet.");
//     }

//     // Switch session state → expect screenshot
//     ctx.session.awaitingScreenshot = true;
//     ctx.session.awaitingTestTradesScreenshot = false;
//     ctx.session.step = "awaitingScreenshot"; // <--- add this
//     await redis.set(
//       `forex:${ctx.from.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//   });

//   // If screenshot rejected → ask user to retry
//   bot.action("retry_screenshot_upload", async (ctx) => {
//     await ctx.answerCbQuery();
//     await ctx.reply(
//       "📸 Please upload a new screenshot of your MT4/MT5 account to continue."
//     );

//     ctx.session.awaitingScreenshot = true;
//   });

//   // ---------------- HANDLE SCREENSHOTFOR TEST TRADES ----------------

//   bot.action("continue_test_trades", async (ctx) => {
//     await ctx.answerCbQuery();

//     const testTradesMessage = `
// <b>🧪 Test Trades (System Check)</b>

// You are almost done. Last step! ✅

// To confirm everything works correctly:

// 1️⃣ Open your MT4 app.  
// 2️⃣ Add forex pairs.  
// 3️⃣ Place <b>10 trades</b> (Buy/Sell, lot size = 0.01).  
// 4️⃣ Keep them open for at least 10 minutes.  
// 5️⃣ Send me a <b>screenshot of your open trades</b>.  

// ⚠️ You may gain/lose a few dollars – this is just a system check.  
// 💡 I can assist live, but close trades after 10 minutes if I don’t respond.
// `;

//     // Load broker-specific video (like in mt4_setup)
//     const user = await FOREX_User.findOne({ telegramId: ctx.from.id });
//     if (!user) {
//       await ctx.reply("❌ Could not find your registration details.");
//       return;
//     }

// // 🎥 Use one universal video (regardless of broker)
//   const universalVideoFileId = process.env.MT4_ALL_VIDEO_FILE_ID!;

// //     // Send instructions
//     await ctx.replyWithHTML(testTradesMessage, {
//       link_preview_options: { is_disabled: true },
//     });

// // Send universal video if available
//   if (universalVideoFileId) {
//     try {
//       await ctx.replyWithVideo(universalVideoFileId, {
//         caption: "🎥 Watch this short guide before placing your test trades",
//       });
//     } catch (err) {
//       console.error("⚠️ Failed to send video:", err);
//       await ctx.replyWithHTML(
//         `⚠️ <i>Video guide unavailable at the moment.</i>\nPlease follow the written steps carefully.`
//       );
//     }
//   }


//     // Switch session state → expect screenshot of test trades
//     ctx.session.awaitingTestTradesScreenshot = true;
//     ctx.session.awaitingScreenshot = false;
//     ctx.session.step = "awaitingTestTradesScreenshot"; // <--- add this
//     await redis.set(
//       `forex:${ctx.from.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );
//   });

//   // 🔄 Handler for when user clicks "Resubmit Screenshot"
//   bot.action("resubmit_test_trades", async (ctx) => {
//     await ctx.answerCbQuery();
//     if (!ctx.session) return;

//     ctx.session.step = "awaitingTestTradesScreenshot"; // ensure correct step
//     ctx.session.awaitingTestTradesScreenshot = true;
//     await redis.set(
//       `forex:${ctx.from.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );

//     await ctx.replyWithHTML(
//       `<b>📸 Please upload your test trade screenshot again</b>\n\n` +
//         `Ensure it clearly shows the required details.`
//     );
//   });

//   // ================== HANDLE CONTINUE TO FINAL ONBOARDING ==================
//   bot.action("continue_final_onboarding", async (ctx) => {
//     await ctx.answerCbQuery();

//     ctx.session.step = "final_onboarding"; // add this
//     await redis.set(
//       `forex:${ctx.from.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );

//     const finalOnboardingMessage = `

// 🥳 Welcome to Afibie FX!  

// Before you start trading signals, please watch my short speed course (10 minutes max).  
// It shows how to copy trades correctly with proper risk management.  

// 👉 <a href="https://t.me/afibie">t.me/afibie</a>  

// Once finished, click <b>Done</b> to generate your exclusive signal channel invite link.  

// ⚠️ <b>Note:</b> The link expires in 30 minutes after generation. Join immediately.  
// If you need help, contact @Francis_Nbtc.
// `;

//     await ctx.replyWithHTML(finalOnboardingMessage, {
//       link_preview_options: { is_disabled: true },
//       reply_markup: {
//         inline_keyboard: [[{ text: "✅ Done", callback_data: "final_done" }]],
//       },
//     });
//   });

//   const getLinkLimiter = rateLimit({
//     window: 60_000, // 1 min
//     limit: 3, // 3 requests per window
//     onLimitExceeded: (ctx: any) =>
//       ctx.reply("🚫 Too many link requests! Try again later."),
//   });

//   // ✅ Handler for when user clicks "Done" after final onboarding
//   bot.action("final_done", getLinkLimiter, async (ctx) => {
//     await ctx.answerCbQuery();
//     const telegramId = ctx.from?.id?.toString();
//     if (!telegramId) return;

//     ctx.session.step = "completed"; // new final step
//     await redis.set(
//       `forex:${ctx.from.id}`,
//       JSON.stringify(ctx.session),
//       "EX",
//       86400
//     );

//     try {
//       const user = await FOREX_User.findOne({
//         telegramId,
//       });
//       if (!user) {
//         await ctx.reply(
//           "⚠️ Could not find your registration. Please restart with /start."
//         );
//         return;
//       }

//       // Generate invite link (like forex bot)
//       const inviteLink = await bot.telegram.createChatInviteLink(
//         GROUP_CHAT_ID!,
//         {
//           expire_date: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
//           member_limit: 1,
//         }
//       );

//       await ctx.replyWithHTML(
//         `<b>🎉 Welcome to Afibie FX Signals! 🚀</b>\n\n` +
//           `Here’s your exclusive access link:\n<a href="${inviteLink.invite_link}">${inviteLink.invite_link}</a>\n\n` +
//           `⚠️ <b>Note:</b> This link expires in 30 minutes. Join immediately.`
//       );
//     } catch (err) {
//       console.error("Error generating invite link:", err);
//       await ctx.reply(
//         "❌ Failed to generate invite link. Please contact admin."
//       );
//     }
//   });

//   // ---------------- HANDLE SCREENSHOT ----------------
//   bot.on("photo", async (ctx) => {
//     try {
//       const fileId = ctx.message.photo.pop()?.file_id;
//       if (!fileId) return;

//       const fileUrl = await ctx.telegram.getFileLink(fileId);

//       // Upload to Cloudinary
//       const uploadRes = await cloudinary.uploader.upload(fileUrl.href, {
//         folder: "forex_screenshots",
//       });

//       // Update MongoDB

//       if (ctx.session.awaitingScreenshot) {
//         // Save MT4/MT5 account screenshot
//         await FOREX_User.findOneAndUpdate(
//           { telegramId: ctx.from.id },
//           {
//             screenshotUrl: uploadRes.secure_url,
//             screenshotUrl_status: "awaiting_approval",
//             screenshotUrl_approvedAt: null,
//             screenshotUrl_rejectedAt: null,
//             screenshotUrl_rejectionReason: null,
//           },
//           { new: true }
//         );
//         ctx.session.awaitingScreenshot = false;
//         ctx.session.awaitingTestTradesScreenshot = false;
//         await ctx.reply("📸 Screenshot received. Awaiting admin approval ⏳");
//       } else if (ctx.session.awaitingTestTradesScreenshot) {
//         // Save test trades screenshot
//         await FOREX_User.findOneAndUpdate(
//           { telegramId: ctx.from.id },
//           {
//             testTradesScreenshotUrl: uploadRes.secure_url,
//             testTradesScreenshotUrl_status: "awaiting_approval",
//             testTradesScreenshotUrl_approvedAt: null,
//             testTradesScreenshotUrl_rejectedAt: null,
//             testTradesScreenshotUrl_rejectionReason: null,
//           },
//           { new: true }
//         );
//         ctx.session.awaitingScreenshot = false;
//         ctx.session.awaitingTestTradesScreenshot = false;
//         await ctx.reply(
//           "📸 Test trades screenshot received. Awaiting admin approval ⏳"
//         );
//       }
//     } catch (err) {
//       console.error("❌ Screenshot upload failed:", err);
//       await ctx.reply("⚠️ Failed to upload screenshot. Please try again.");
//     }
//   });

//   watchUserStatusChanges();
//   // getting the video file id from

//   // bot.on("video", async (ctx) => {
//   //   const fileId = ctx.message.video.file_id;
//   //   console.log("🎥 Video File ID:", fileId);

//   //   await ctx.reply(`✅ Got it!\nFile ID: <code>${fileId}</code>`, {
//   //     parse_mode: "HTML",
//   //   });
//   // });
// }







import { Telegraf, Markup } from "telegraf";
import rateLimit from "telegraf-ratelimit";
import cloudinary from "../config/cloudinary";
import Fuse from "fuse.js";
import { BotContext } from "../telegrafContext";
import {
  groupACountries,
  groupBCountries,
  groupCCountries,
  groupDcountries,
} from "./constant";
import { FOREX_User, IFOREX_User } from "../models/new-forex_user.model";
import { sendAdminAlertForex } from "../utils/services/notifier-new-forex";
import Redis from "ioredis";

import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const GROUP_CHAT_ID = process.env.FOREX_GROUP_CHAT_ID;
const EXNESS_LINK = process.env.EXNESS_LINK || "https://exness.com";
const AXI_LINK = process.env.AXI_LINK || "https://axi.com";
const EXCO_LINK = process.env.EXCO_TRADER_LINK || "https://exco.com";
const OANDO_LINK = process.env.MT4_ALL_LINK || "https://oanda.com";

let redis: Redis;
try {
  redis =
    process.env.NODE_ENV === "production"
      ? new Redis(process.env.REDIS_URL!)
      : new Redis();
  console.log("✅ Redis connected");
} catch (err) {
  console.error("❌ Redis connection error:", err);
}

export default function (bot: Telegraf<BotContext>) {
  console.log("💬 forexBot_New file loaded");

  // ---------------- COUNTRY GROUPS ----------------
  const allCountries = [
    ...groupACountries,
    ...groupBCountries,
    ...groupCCountries,
    ...groupDcountries,
  ];
  const fuse = new Fuse(allCountries, { threshold: 0.3 });

  // -------------------- REDIS SESSION MIDDLEWARE --------------------
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return next();

    const sessionKey = `forex:${telegramId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      ctx.session = { step: "welcome", botType: "forex_new", retryCount: 0 };
      await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    } else {
      ctx.session = JSON.parse(sessionData);
    }

    return next();
  });

  // ---------------- Notify user after approval or rejection after admin review on loginId ----------------

  async function notifyUserApproved(user: IFOREX_User) {
    const message = `
   ✅ <b>Approved</b>

   Thanks for waiting

   We confirmed that you used the recommended link and have made the minimum deposit.  

   🎉 Congratulations! The next step is to make sure your account is set up correctly for trading.
  `;

    try {
      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("Continue", "mt4_setup")],
        ]).reply_markup,
      });
    } catch (err) {
      console.error("❌ Failed to notify user (approved):", err);
    }
  }

  async function notifyUserRejected(user: IFOREX_User, reason: string) {
    let message = "";
    let buttonText = "";
    let callbackData = "";

    const predefinedReasons = [
      "deposit_missing",
      "deposit_incomplete",
      "duplicate_id",
      "wrong_link",
      "demo_account",
    ];

    const isCustom = !predefinedReasons.includes(reason);

    // 🟡 Handle custom reason
    if (isCustom || reason === "other") {
      message = `
   Thanks for waiting

   ❌ <b>Your Login ID was rejected</b>

   <b>Reason:</b> ${reason || "Unspecified issue"}

   Please correct this issue and <b>click the button below</b> to resubmit your Login ID.
   `;
      buttonText = "🔄 Click to Retry Submission";
      callbackData = "broker_done";
    }

    // 🟠 Deposit Missing
    else if (reason === "deposit_missing") {
      message = `
  Thanks for waiting

  ❌ <b>Rejected – Deposit Missing</b>

  We confirmed that you used the recommended link but have not made the required minimum deposit.  

 ⚠️ Please make your deposit first, then <b>click the button below</b> to resubmit your Login ID.  
 (One last chance; repeated unfunded resubmits = permanent block.)
 `;
      buttonText = "💰 Click to ReSubmit";
      callbackData = "broker_done";
    }

    // 🟢 Deposit Incomplete
    else if (reason === "deposit_incomplete") {
      message = `
Thanks for waiting

❌ <b>Rejected – Incomplete Deposit</b>

Your deposit amount does not meet the required minimum.  

Please fund your account with at least <b>$160</b>, then <b>click the button below</b> to resubmit your Login ID.
`;
      buttonText = "💵 Click to ReSubmit After Funding";
      callbackData = "broker_done";
    }

    // 🔵 Duplicate ID
    else if (reason === "duplicate_id") {
      message = `
Thanks for waiting

❌ <b>Rejected – Duplicate Login ID</b>

The Login ID you provided is already associated with another user. 

Please double-check your broker account and <b>click the button below</b> to resubmit the correct Login ID.
`;
      buttonText = "🔄 Click to ReSubmit Login ID";
      callbackData = "broker_done";
    }

    // 🟣 Demo Account
    else if (reason === "demo_account") {
      message = `
 Thanks for waiting
    
❌ <b>Rejected – Demo Account Detected</b>

It seems the account you provided is a <b>demo</b> account.  

Please submit a <b>live</b> trading account Login ID</b> and <b>click the button below</b> to continue.
`;
      buttonText = "🎯 Click to Submit Live Account";
      callbackData = "broker_done";
    }

    // 🔴 Wrong Link
    else if (reason === "wrong_link") {
      let brokerLink = "";
      switch (user.broker) {
        case "Exness":
          brokerLink = process.env.EXNESS_LINK || "https://exness.com";
          break;
        case "AXI":
          brokerLink = process.env.AXI_LINK || "https://axi.com";
          break;
        case "Exco":
          brokerLink = process.env.EXCO_TRADER_LINK || "https://exco.com";
          break;
        case "Oanda":
          brokerLink = process.env.MT4_ALL_LINK || "https://oanda.com";
          break;
        default:
          brokerLink = process.env.BROKER_LINK || "https://defaultbroker.com";
      }

      message = `
 Thanks for waiting 

❌ <b>Rejected – Wrong Registration Link</b>

Your Login ID is not found in our record, which means you did not register using the correct link.  

👉 Please register again using the correct link below, make your deposit, then <b>click the button below</b> to confirm.

<a href="${brokerLink}">${user.broker} Registration Link</a>
`;
      buttonText = "🔗 Click After Registering";
      callbackData = "retry_broker";
    }

    // ✅ Send message
    try {
      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback(buttonText, callbackData)],
        ]).reply_markup,
      });
    } catch (err) {
      console.error("❌ Failed to notify user (rejected):", err);
    }
  }

  // ---------------- notify user after mt4/mt5 screenshot upload ----------------

  // ✅ APPROVED
  async function notifyUserScreenshotApproved(user: IFOREX_User) {
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `Thanks for waiting\n\n✅ Your screenshot has been approved!\n\nClick the button below to continue to the final step.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "➡️ Continue", callback_data: "continue_test_trades" }],
            ],
          },
        }
      );
    } catch (err) {
      console.error("❌ Failed to notify user about screenshot approval:", err);
    }
  }

  async function notifyUserScreenshotRejected(
    user: IFOREX_User,
    reason: string
  ) {
    try {
      const readableReason = reason || "Unspecified";

      await bot.telegram.sendMessage(
        user.telegramId,
        `Thanks for waiting\n\n❌ <b>Your screenshot was rejected.</b>\n\n<b>Reason:</b> ${readableReason}\n\nPlease upload a new screenshot to continue.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔄 Retry Screenshot Upload",
                  callback_data: "retry_screenshot_upload",
                },
              ],
            ],
          },
        }
      );
    } catch (err) {
      console.error(
        "❌ Failed to notify user about screenshot rejection:",
        err
      );
    }
  }

  // ================== NOTIFY USER: TEST TRADE SCREENSHOT APPROVED ==================
  async function notifyUserTestTradeScreenshotApproved(user: IFOREX_User) {
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `Thanks for waiting\n\n✅ Your Test Trades screenshot has been approved! 🎉\n\n` +
          `Please click <b>Continue</b> below to move forward with the final onboarding steps.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➡️ Continue",
                  callback_data: "continue_final_onboarding",
                },
              ],
            ],
          },
        }
      );
    } catch (err) {
      console.error(
        "❌ Failed to notify user about Test Trades screenshot approval:",
        err
      );
    }
  }

  // ================== NOTIFY USER: TEST TRADE SCREENSHOT REJECTED ==================

  async function notifyUserTestTradeScreenshotRejected(
    user: IFOREX_User,
    reason: string
  ) {
    try {
      const readableReason = reason || "Unspecified";

      const message = `
Thanks for waiting

❌ <b>Your Test Trades screenshot was rejected</b>

<b>Reason:</b> ${readableReason}

👉 Please click the button below to <b>Resubmit Screenshot</b>.
`;

      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📸 Resubmit Screenshot",
                callback_data: "resubmit_test_trades",
              },
            ],
          ],
        },
      });
    } catch (err) {
      console.error(
        "❌ Failed to notify user about Test Trades screenshot rejection:",
        err
      );
    }
  }

  // ---------------- WATCH FOR STATUS CHANGES IN MONGODB ----------------
  async function watchUserStatusChanges() {
    try {
      const changeStream = FOREX_User.watch([], {
        fullDocument: "updateLookup",
      });

      changeStream.on("change", async (change) => {
        if (
          change.operationType === "update" &&
          change.updateDescription.updatedFields
        ) {
          const updated = change.updateDescription.updatedFields;
          const user = change.fullDocument as IFOREX_User;

          // ✅ Login ID
          if (updated.loginId_status === "approved") {
            await notifyUserApproved(user);
          }

          if (updated.loginId_status === "rejected") {
            const reason =
              user.loginId_customRejectionReason ||
              user.loginId_rejectionReason ||
              "Unspecified";
            await notifyUserRejected(user, reason);
          }

          // ✅ First Screenshot
          if (updated.screenshotUrl_status === "approved") {
            await notifyUserScreenshotApproved(user);
          }

          if (updated.screenshotUrl_status === "rejected") {
            const reason =
              user.screenshotUrl_customRejectionReason ||
              user.screenshotUrl_rejectionReason ||
              "Unspecified";

            await notifyUserScreenshotRejected(user, reason);
          }

          // ✅ Test Trades Screenshot
          if (updated.testTradesScreenshotUrl_status === "approved") {
            await notifyUserTestTradeScreenshotApproved(user);
          }

          if (updated.testTradesScreenshotUrl_status === "rejected") {
            const reason =
              user.testTradesScreenshotUrl_customRejectionReason ||
              user.testTradesScreenshotUrl_rejectionReason ||
              "Unspecified";

            await notifyUserTestTradeScreenshotRejected(user, reason);
          }
        }
      });
    } catch (error) {
      console.error(
        "[watchUserStatusChanges] Error setting up change stream:",
        error
      );
    }
  }



const contactAdminButton = Markup.inlineKeyboard([
  [Markup.button.callback("💬 Contact Admin", "contact_admin")],
]);



  // ---------------- START ----------------
  bot.start(async (ctx) => {
    const text = ctx.message.text.trim();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

     ctx.session.mode = "default";

    const user = await FOREX_User.findOne({ telegramId });

    if (user && user.mode === "chat") {
      ctx.session.mode = "chat";
    } else {
      ctx.session.mode = "default";
    }

    ctx.session.step = "welcome";
    await redis.set(
      `forex:${ctx.from?.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
    await ctx.replyWithHTML(
      `👋 Hey <b>${ctx.from?.first_name || "there"}</b>,\n\n` +
        `Welcome – and congratulations on taking the first real step toward consistent profits with our premium forex signals.\n\n` +
        `This bot will walk you through the process step by step. After answering a few quick questions, you’ll be connected to me and my team for verification.\n\n` +
        `👉 If you’re ready, click Continue.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Continue", callback_data: "continue_to_captcha" }],
          ],
        },
      }
    );
  });

  // ---------------- CAPTCHA ----------------
  bot.action("continue_to_captcha", async (ctx) => {
    const captcha = Math.floor(10000 + Math.random() * 90000).toString();
    ctx.session.captcha = captcha;
    ctx.session.step = "captcha";

    await redis.set(
      `forex:${ctx.from?.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );

    await ctx.replyWithHTML(
      `<b>🔐 Captcha Verification</b>\n\nPlease type this code:\n<code>${captcha}</code>`
    );
  });

  // ---------------- HANDLE TEXT ----------------
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    // ✅ If user is in chat mode
    if (ctx.session.mode === "chat") {
      // Save message to DB (append)
      await FOREX_User.updateOne(
        { telegramId },
        {
          $push: {
            messages: {
              // from: "user",
              sender: "user",
              user: "User",
              text,
              readByAdmin: false, // Explicitly unread
              timestamp: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
        }
      );

      // Send to admin via WebSocket
      globalThis.forexChatHandler?.sendToAdmin(telegramId, text);

      // await ctx.reply("📩 Message sent to admin. Please wait for a reply.");
      return;
    }

    // ✅ Captcha verification
    if (ctx.session.step === "captcha") {
      if (text === ctx.session.captcha) {
        ctx.session.step = "country";
        await redis.set(
          `forex:${telegramId}`,
          JSON.stringify(ctx.session),
          "EX",
          86400
        );
        await ctx.replyWithHTML(
          `🌍 <b>Country Check</b>\n\n` +
            `📌 <i>What is your country?</i>\n\n` +
            `✍️ Type your country name so I know how best to help you.`
        );
      } else {
        const captcha = Math.floor(10000 + Math.random() * 90000).toString();
        ctx.session.captcha = captcha;
        await redis.set(
          `forex:${telegramId}`,
          JSON.stringify(ctx.session),
          "EX",
          86400
        );
        await ctx.replyWithHTML(
          `❌ Wrong captcha.\nTry again: <code>${captcha}</code>`
        );
      }
      return;
    }

    // ✅ Country detection (Fuse.js)
    if (ctx.session.step === "country") {
      const result = fuse.search(text);
      if (result.length === 0) {
        await ctx.reply(`❌ Couldn’t recognize "${text}". Try again.`);
        return;
      }

      const bestMatch = result[0].item;
      if (bestMatch.toLowerCase() !== text.toLowerCase()) {
        await ctx.replyWithHTML(
          `✍️ Did you mean <b>${bestMatch}</b>?`,
          Markup.inlineKeyboard([
            Markup.button.callback(
              `✅ Yes, ${bestMatch}`,
              `confirm_country:${bestMatch}`
            ),
            Markup.button.callback("❌ No", "retry_country"),
          ])
        );
      } else {
        await handleCountry(ctx, bestMatch);
      }
      return;
    }

    // ✅ Login ID validation (5–8 digits only)
    if (ctx.session.awaitingLoginId) {
      if (/^[a-zA-Z0-9]{3,30}$/.test(text)) {
        ctx.session.loginId = text;
        ctx.session.awaitingLoginId = false;
        ctx.session.mode = "chat"; // Enable chat mode

        ctx.session.step = "screenshot";
        await redis.set(
          `forex:${telegramId}`,
          JSON.stringify(ctx.session),
          "EX",
          86400
        );

       await ctx.replyWithHTML(
  `✅ <b>Thank you!</b> We’ve received your <b>Login ID</b>.\n\n` +
    `⏳ <i>Review in Progress:</i>\n` +
    `Our team is currently verifying your details. This process may take up to an hour.\n\n` +
    `💡 <b>If you haven’t received feedback after one hour, kindly click “Contact Admin” below to chat with our support team.</b>`,
  contactAdminButton
);


        // --- Save or Update User in MongoDB ---
        try {
          const telegramId = ctx.from?.id.toString();

          if (!telegramId) {
            await ctx.reply(
              "⚠️ Could not determine your Telegram ID. Please restart the bot."
            );
            return;
          }

          const existingUser = await FOREX_User.findOne({ telegramId });

          if (existingUser) {
            // Update existing user
            existingUser.username = ctx.from?.username;
            existingUser.fullName = `${ctx.from?.first_name || ""} ${
              ctx.from?.last_name || ""
            }`.trim();
            existingUser.country = ctx.session.country || "";
            existingUser.broker = ctx.session.broker || "";
            existingUser.loginId = ctx.session.loginId || "";
            existingUser.loginId_status = "awaiting_approval";
            existingUser.mode = "chat",
            existingUser.updatedAt = new Date();

            await existingUser.save();
            console.log("🔄 Forex user updated:", existingUser);

            // Notify admin of update (optional)
            await sendAdminAlertForex(existingUser);
          } else {
            // Create new user
            const newUser = new FOREX_User({
              telegramId,
              username: ctx.from?.username,
              fullName: `${ctx.from?.first_name || ""} ${
                ctx.from?.last_name || ""
              }`.trim(),
              country: ctx.session.country,
              broker: ctx.session.broker,
              loginId: ctx.session.loginId,
              mode: "chat",
            });

            await newUser.save();
            console.log("✅ New forex user created:", newUser);

            // Notify admin of new registration
            await sendAdminAlertForex(newUser);
          }
        } catch (err) {
          console.error("❌ Failed to save or update forex user:", err);
          await ctx.reply(
            "⚠️ An error occurred while saving your details. Please try again later."
          );
        }
      } else {
        await ctx.replyWithHTML(
          `❌ Invalid Login ID format.\n\n` +
            `👉 Please send only the <b>numbers</b> from your broker’s welcome email (5–8 digits).`
        );
      }
      return;
    }
  });

  // ---------------- COUNTRY CONFIRM ----------------
  bot.action(/confirm_country:(.+)/, async (ctx) => {
    await handleCountry(ctx, ctx.match[1]);
  });

  bot.action("retry_country", async (ctx) => {
    await ctx.reply("🌍 Please type your country again.");
  });

  // ---------------- HELPER FUNCTION ----------------
  async function handleCountry(ctx: BotContext, country: string) {
    ctx.session.country = country;
    let group: string;

    if (groupACountries.includes(country)) group = "A";
    else if (groupBCountries.includes(country)) group = "B";
    else if (groupCCountries.includes(country)) group = "C";
    else if (groupDcountries.includes(country)) group = "D";
    else group = "Unknown";

    ctx.session.group = group;

    // ---------------- GROUP A ----------------
    if (group === "A") {
      ctx.session.step = "broker"; // <--- add this

      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        console.error("❌ ctx.from is undefined. Cannot save session.");
        return;
      }
      await redis.set(
        `forex:${telegramId}`,
        JSON.stringify(ctx.session),
        "EX",
        86400
      );
      await ctx.replyWithHTML(
        `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nDo you already have an Exness account?`,
        Markup.inlineKeyboard([
          Markup.button.callback("✅ Yes", "groupA_yes"),
          Markup.button.callback("❌ No", "groupA_no"),
        ])
      );
    }

    // ---------------- GROUP B ----------------
    else if (group === "B") {
      ctx.session.broker = "AXI";
      ctx.session.step = "broker";

      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        console.error("❌ ctx.from is undefined. Cannot save session.");
        return;
      }
      await redis.set(
        `forex:${telegramId}`,
        JSON.stringify(ctx.session),
        "EX",
        86400
      );

      await ctx.replyWithHTML(
        `Ok Great 👍 \n\n 🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nOur recommended broker is <b>AXI</b>.\n\n👉 Register here: <a href="https://axi.com">AXI Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
        {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Done", callback_data: "broker_done" }],
            ],
          },
        }
      );
    }

    // ---------------- GROUP C ----------------
    else if (group === "C") {
      ctx.session.broker = "Oanda";
      ctx.session.step = "broker";
      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        console.error("❌ ctx.from is undefined. Cannot save session.");
        return;
      }
      await redis.set(
        `forex:${telegramId}`,
        JSON.stringify(ctx.session),
        "EX",
        86400
      );

      await ctx.replyWithHTML(
        `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nOur recommended broker is <b>Oanda</b>.\n\n👉 Register here: <a href="${OANDO_LINK}">Oanda Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
        {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Done", callback_data: "broker_done" }],
            ],
          },
        }
      );
    }

    // ---------------- GROUP D ----------------
    else if (group === "D") {
      ctx.session.broker = "Exness";
      ctx.session.step = "broker"; // <--- add this
      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        console.error("❌ ctx.from is undefined. Cannot save session.");
        return;
      }
      await redis.set(
        `forex:${telegramId}`,
        JSON.stringify(ctx.session),
        "EX",
        86400
      );

      await ctx.replyWithHTML(
        `🌍 Your country: <b>${country}</b>\n\n<b>Broker Setup</b>\n\nDo you already have an Exness account?`,
        Markup.inlineKeyboard([
          Markup.button.callback("✅ Yes", "groupD_yes"),
          Markup.button.callback("❌ No", "groupD_no"),
        ])
      );
    }
  }

  // ---------------- BROKER FLOW ----------------
  bot.action("groupA_no", async (ctx) => {
    ctx.session.broker = "Exness";
    ctx.session.step = "broker"; // <--- add this
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      console.error("❌ ctx.from is undefined. Cannot save session.");
      return;
    }
    await redis.set(
      `forex:${telegramId}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );

    await ctx.replyWithHTML(
      `Ok Great 👍 \n\n ❌ <b>Register with Exness</b> 👉 <a href="${EXNESS_LINK}">Exness Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Done", callback_data: "broker_done" }],
          ],
        },
      }
    );
  });

  bot.action("groupA_yes", async (ctx) => {
    ctx.session.broker = "AXI";
    ctx.session.step = "broker";
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      console.error("❌ ctx.from is undefined. Cannot save session.");
      return;
    }
    await redis.set(
      `forex:${telegramId}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
    await ctx.replyWithHTML(
      `Ok Great 👍  \n\n ✅ <b>Register with AXI</b> 👉 <a href="${AXI_LINK}">AXI Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Done", callback_data: "broker_done" }],
          ],
        },
      }
    );
  });

  // ---------------- GROUP D – YES / NO ----------------
  bot.action("groupD_no", async (ctx) => {
    ctx.session.broker = "Exness";
    ctx.session.step = "broker";
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      console.error("❌ ctx.from is undefined. Cannot save session.");
      return;
    }
    await redis.set(
      `forex:${telegramId}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
    await ctx.replyWithHTML(
      `Ok Great 👍  \n\n ❌ <b>Register with Exness</b> 👉 <a href="${EXNESS_LINK}">Exness Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Done", callback_data: "broker_done" }],
          ],
        },
      }
    );
  });

  bot.action("groupD_yes", async (ctx) => {
    ctx.session.broker = "Exco";
    ctx.session.step = "broker";
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      console.error("❌ ctx.from is undefined. Cannot save session.");
      return;
    }
    await redis.set(
      `forex:${telegramId}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
    await ctx.replyWithHTML(
      `Ok Great 👍  \n\n ✅ <b>Register with Exco</b> 👉 <a href="${EXCO_LINK}">Exco Link</a>\n\n⚡ It is important you use this link. Once you have created an account, comeback here and click <b>Done</b>.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Done", callback_data: "broker_done" }],
          ],
        },
      }
    );
  });

  bot.action("broker_done", async (ctx) => {
    try {
      // Always attempt to acknowledge callback, but ignore stale ones
      try {
        await ctx.answerCbQuery();
      } catch (err: any) {
        if (
          err.description?.includes("query is too old") ||
          err.description?.includes("query ID is invalid")
        ) {
          console.warn("⚠️ Ignored stale callback query for broker_done");
        } else {
          console.error("⚠️ Error answering callback query:", err);
        }
      }

      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        console.error("❌ ctx.from is undefined. Cannot save session.");
        return;
      }

      await ctx.replyWithHTML(
        `<b> Deposit Requirement and Verification</b>\n\n` +
          `✅ Verify your account and make a minimum deposit of <b>$160</b>.\n\n` +
          `💡 However, I Recommended minimum deposit of:\n` +
          `▫️ <b>$300</b> for solid risk management on normal trades\n` +
          `▫️ <b>$500</b> if you plan to trade our <b>Gold Signals</b> safely\n\n` +
          `👉 Once Funded, send me your <b>Login ID</b> for Verification\n\n` +
          `⚠️ <b>Do not send your password.</b>\n\n` +
          `⚠️ <b>You can watch the video below for a video guide 👇</b>`
      );

      // 🔹 Send broker-specific video if available
      let videoFileId: string | undefined;
      switch (ctx.session.broker) {
        case "Exness":
          videoFileId = process.env.EXNESS_VIDEO_FILE_ID;
          break;
        case "AXI":
          videoFileId = process.env.AXI_VIDEO_FILE_ID;
          break;
        case "Exco":
          videoFileId = process.env.EXCO_VIDEO_FILE_ID;
          break;
        case "Oanda":
          videoFileId = process.env.MT4_ALL_VIDEO_FILE_ID;
          break;
      }

      if (videoFileId && ctx.chat) {
        try {
          await ctx.telegram.sendVideo(ctx.chat.id, videoFileId, {
            caption: "Here’s how to find your Login ID",
          });
        } catch (err) {
          await ctx.replyWithHTML(
            `⚠️ <i>Video guide unavailable at the moment.</i>\n` +
              `Please check your broker’s welcome email for instructions.`
          );
        }
      }

      ctx.session.awaitingLoginId = true;
      ctx.session.step = "awaitingLoginId";
      await redis.set(
        `forex:${telegramId}`,
        JSON.stringify(ctx.session),
        "EX",
        86400
      );
    } catch (err) {
      console.error("❌ Error in broker_done handler:", err);
    }
  });

  // ----------------RETRY BROKER FOR WRONG LINK ----------------

  bot.action("retry_broker", async (ctx) => {
    // Use broker from session if available
    const broker = ctx.session?.broker || "your broker";
    let brokerLink = "";

    switch (broker) {
      case "Exness":
        brokerLink = process.env.EXNESS_LINK || "https://exness.com";
        break;
      case "AXI":
        brokerLink = process.env.AXI_LINK || "https://axi.com";
        break;
      case "Exco":
        brokerLink = process.env.EXCO_TRADER_LINK || "https://exco.com";
        break;
      case "Oanda":
        brokerLink = process.env.MT4_ALL_LINK || "https://oanda.com";
        break;
      default:
        brokerLink = process.env.BROKER_LINK || "https://defaultbroker.com";
    }

    await ctx.replyWithHTML(
      `⚠️ Please register again using the correct link:\n\n` +
        `<a href="${brokerLink}">${broker} Link</a>\n\n` +
        `👉 Once you have registered and deposited, click <b>Done</b>.`,
      {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Done", callback_data: "broker_done" }],
          ],
        },
      }
    );
  });

  // ---------------- HANDLE MT4/MT5 SETUP FLOW ----------------

  bot.action("mt4_setup", async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      console.error("❌ ctx.from is undefined. Cannot save session.");
      return;
    }

    const setupMessage = `
<b>📊 Setting Up Your Trading Platform</b>

1️⃣ Check your email for broker login credentials (Account Number, Password, and Server).  
2️⃣ Download MT4/MT5:  

🔹 MT4 iPhone: <a href="https://apps.apple.com/ph/app/metatrader-4/id496212596">Download MT4 iOS</a>  
🔹 MT4 Android: <a href="https://play.google.com/store/search?q=mt4&c=apps">Download MT4 Android</a>  
🔹 MT5 iPhone: <a href="https://apps.apple.com/ph/app/metatrader-5/id413251709">Download MT5 iOS</a>  
🔹 MT5 Android: <a href="https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5">Download MT5 Android</a>  

3️⃣ Log in to your account – use the credentials from the email (make sure it’s a LIVE account).  

4️⃣ Once logged in, <b>please send me a screenshot of your MT4/MT5 account</b> to confirm setup.

📹 Watch the broker-specific video guide below.  
💡 If you run into any trouble, I’ll assist you step by step.
`;

    // Fetch user from DB (assuming you saved telegramId in session)
    const user = await FOREX_User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      await ctx.reply("❌ Could not find your registration details.");
      return;
    }

    // Map broker → video file ID
    const brokerVideos: Record<string, string | undefined> = {
      axi: process.env.MT4_AXI_VIDEO_FILE_ID,
      exness: process.env.MT4_EXNESS_VIDEO_FILE_ID,
      exco: process.env.MT4_EXCO_VIDEO_FILE_ID,
      oanda: process.env.MT4_OANDA_VIDEO_FILE_ID,
    };

    const brokerKey = user.broker?.toLowerCase();
    const videoFileId = brokerVideos[brokerKey];

    // Send setup message
    await ctx.replyWithHTML(setupMessage, {
      link_preview_options: { is_disabled: true },
    });

    // Send the video only if found for broker
    if (videoFileId) {
      await ctx.replyWithVideo(videoFileId, {
        caption: `🎥 MT4/MT5 Setup Guide for ${user.broker}`,
      });
    } else {
      await ctx.reply("⚠️ No video guide available for your broker yet.");
    }

    // Switch session state → expect screenshot
    ctx.session.awaitingScreenshot = true;
    ctx.session.awaitingTestTradesScreenshot = false;
    ctx.session.step = "awaitingScreenshot"; // <--- add this
    await redis.set(
      `forex:${ctx.from.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
  });

  // If screenshot rejected → ask user to retry
  bot.action("retry_screenshot_upload", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📸 Please upload a new screenshot of your MT4/MT5 account to continue."
    );

    ctx.session.awaitingScreenshot = true;
  });

  // ---------------- HANDLE SCREENSHOTFOR TEST TRADES ----------------

  bot.action("continue_test_trades", async (ctx) => {
    await ctx.answerCbQuery();

    const testTradesMessage = `
<b>🧪 Test Trades (System Check)</b>

You are almost done. Last step! ✅

To confirm everything works correctly:

1️⃣ Open your MT4 app.  
2️⃣ Add forex pairs.  
3️⃣ Place <b>10 trades</b> (Buy/Sell, lot size = 0.01).  
4️⃣ Keep them open for at least 10 minutes.  
5️⃣ Send me a <b>screenshot of your open trades</b>.  

⚠️ You may gain/lose a few dollars – this is just a system check.  
💡 I can assist live, but close trades after 10 minutes if I don’t respond.
`;

    // Load broker-specific video (like in mt4_setup)
    const user = await FOREX_User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply("❌ Could not find your registration details.");
      return;
    }

    // 🎥 Use one universal video (regardless of broker)
    const universalVideoFileId = process.env.MT4_ALL_VIDEO_FILE_ID!;

    //     // Send instructions
    await ctx.replyWithHTML(testTradesMessage, {
      link_preview_options: { is_disabled: true },
    });

    // Send universal video if available
    if (universalVideoFileId) {
      try {
        await ctx.replyWithVideo(universalVideoFileId, {
          caption: "🎥 Watch this short guide before placing your test trades",
        });
      } catch (err) {
        console.error("⚠️ Failed to send video:", err);
        await ctx.replyWithHTML(
          `⚠️ <i>Video guide unavailable at the moment.</i>\nPlease follow the written steps carefully.`
        );
      }
    }

    // Switch session state → expect screenshot of test trades
    ctx.session.awaitingTestTradesScreenshot = true;
    ctx.session.awaitingScreenshot = false;
    ctx.session.step = "awaitingTestTradesScreenshot"; // <--- add this
    await redis.set(
      `forex:${ctx.from.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );
  });

  // 🔄 Handler for when user clicks "Resubmit Screenshot"
  bot.action("resubmit_test_trades", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session) return;

    ctx.session.step = "awaitingTestTradesScreenshot"; // ensure correct step
    ctx.session.awaitingTestTradesScreenshot = true;
    await redis.set(
      `forex:${ctx.from.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );

    await ctx.replyWithHTML(
      `<b>📸 Please upload your test trade screenshot again</b>\n\n` +
        `Ensure it clearly shows the required details.`
    );
  });

  // ================== HANDLE CONTINUE TO FINAL ONBOARDING ==================
  bot.action("continue_final_onboarding", async (ctx) => {
    await ctx.answerCbQuery();

    ctx.session.step = "final_onboarding"; // add this
    await redis.set(
      `forex:${ctx.from.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );

    const finalOnboardingMessage = `

🥳 Welcome to Afibie FX!  

Before you start trading signals, please watch my short speed course (10 minutes max).  
It shows how to copy trades correctly with proper risk management.  

👉 <a href="https://t.me/afibie">t.me/afibie</a>  

Once finished, click <b>Done</b> to generate your exclusive signal channel invite link.  

⚠️ <b>Note:</b> The link expires in 30 minutes after generation. Join immediately.  
If you need help, contact @Francis_Nbtc.
`;

    await ctx.replyWithHTML(finalOnboardingMessage, {
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Done", callback_data: "final_done" }]],
      },
    });
  });

  const getLinkLimiter = rateLimit({
    window: 60_000, // 1 min
    limit: 3, // 3 requests per window
    onLimitExceeded: (ctx: any) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  // ✅ Handler for when user clicks "Done" after final onboarding
  bot.action("final_done", getLinkLimiter, async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    ctx.session.step = "completed"; // new final step
    await redis.set(
      `forex:${ctx.from.id}`,
      JSON.stringify(ctx.session),
      "EX",
      86400
    );

    try {
      const user = await FOREX_User.findOne({
        telegramId,
      });
      if (!user) {
        await ctx.reply(
          "⚠️ Could not find your registration. Please restart with /start."
        );
        return;
      }

      // Generate invite link (like forex bot)
      const inviteLink = await bot.telegram.createChatInviteLink(
        GROUP_CHAT_ID!,
        {
          expire_date: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
          member_limit: 1,
        }
      );

      await ctx.replyWithHTML(
        `<b>🎉 Welcome to Afibie FX Signals! 🚀</b>\n\n` +
          `Here’s your exclusive access link:\n<a href="${inviteLink.invite_link}">${inviteLink.invite_link}</a>\n\n` +
          `⚠️ <b>Note:</b> This link expires in 30 minutes. Join immediately.`
      );
    } catch (err) {
      console.error("Error generating invite link:", err);
      await ctx.reply(
        "❌ Failed to generate invite link. Please contact admin."
      );
    }
  });

  // 🟢 Button for user to contact admin
bot.action("contact_admin", async (ctx) => {
  ctx.session.mode = "chat"; // Switch to chat mode automatically
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `💬 <b>Chat mode activated.</b>\n\n` +
      `🗨️ You can now send a message to our admin.\n\n` +
      `Once your issue has been resolved, you’ll automatically exit chat mode.`
  );
});

  // ---------------- HANDLE SCREENSHOT ----------------
  bot.on("photo", async (ctx) => {
    try {
      const fileId = ctx.message.photo.pop()?.file_id;
      if (!fileId) return;

      const fileUrl = await ctx.telegram.getFileLink(fileId);

      // Upload to Cloudinary
      const uploadRes = await cloudinary.uploader.upload(fileUrl.href, {
        folder: "forex_screenshots",
      });

      // Update MongoDB

      if (ctx.session.awaitingScreenshot) {
        // Save MT4/MT5 account screenshot
        await FOREX_User.findOneAndUpdate(
          { telegramId: ctx.from.id },
          {
            screenshotUrl: uploadRes.secure_url,
            screenshotUrl_status: "awaiting_approval",
            screenshotUrl_approvedAt: null,
            screenshotUrl_rejectedAt: null,
            screenshotUrl_rejectionReason: null,
          },
          { new: true }
        );
        ctx.session.awaitingScreenshot = false;
        ctx.session.awaitingTestTradesScreenshot = false;
        ctx.session.mode = "chat"; // Enable chat mode
        // await ctx.reply("📸 Screenshot received. Awaiting admin approval ⏳");
        await ctx.replyWithHTML(
  `📸 <b> MT4/MT5 Screenshot Received!</b>\n\n` +
    `⏳ <i>Your submission is being reviewed by our team.</i>\n\n` +
    `💡 <b>If your submission hasn’t been approved after one hour, please click “Contact Admin” below to reach our support team.</b>`,
  contactAdminButton
);

      } else if (ctx.session.awaitingTestTradesScreenshot) {
        // Save test trades screenshot
        await FOREX_User.findOneAndUpdate(
          { telegramId: ctx.from.id },
          {
            testTradesScreenshotUrl: uploadRes.secure_url,
            testTradesScreenshotUrl_status: "awaiting_approval",
            testTradesScreenshotUrl_approvedAt: null,
            testTradesScreenshotUrl_rejectedAt: null,
            testTradesScreenshotUrl_rejectionReason: null,
          },
          { new: true }
        );
        ctx.session.awaitingScreenshot = false;
        ctx.session.awaitingTestTradesScreenshot = false;
        ctx.session.mode = "chat"; // Enable chat mode
        // await ctx.reply(
        //   "📸 Test trades screenshot received. Awaiting admin approval ⏳"
        // );
        await ctx.replyWithHTML(
  `📸 <b>Test Trade Screenshot Received!</b>\n\n` +
    `⏳ <i>Your submission is being reviewed by our team.</i>\n\n` +
    `💡 <b>If your submission hasn’t been approved after one hour, please click “Contact Admin” below to reach our support team.</b>`,
  contactAdminButton
);

      }
    } catch (err) {
      console.error("❌ Screenshot upload failed:", err);
      await ctx.reply("⚠️ Failed to upload screenshot. Please try again.");
    }
  });

  watchUserStatusChanges();
  // getting the video file id from

  // bot.on("video", async (ctx) => {
  //   const fileId = ctx.message.video.file_id;
  //   console.log("🎥 Video File ID:", fileId);

  //   await ctx.reply(`✅ Got it!\nFile ID: <code>${fileId}</code>`, {
  //     parse_mode: "HTML",
  //   });
  // });
}

