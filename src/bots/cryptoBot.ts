
// src/bots/crypto.ts
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { ICRYPTO_User, CryptoUserModel } from "../models/crypto_user.model";
import { sendAdminAlertCrypto } from "../utils/services/notifier-crypto";
import { generateCaptcha, verifyCaptcha } from "../utils/captcha";
import { isValidUID } from "../utils/validate";
import rateLimit from "telegraf-ratelimit";
import { BotContext } from "../telegrafContext";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const VIDEO_FILE_ID = process.env.BYBIT_VIDEO_FILE_ID;
const GROUP_CHAT_ID = process.env.CRYPTO_GROUP_CHAT_ID;

export default function (bot: Telegraf<BotContext>) {
  // Initialize session properties
  bot.use((ctx, next) => {
    // Ensure session exists and has required properties
    if (!ctx.session) {
      ctx.session = {
        step: "welcome",
        botType: "crypto"
      };
    } else {
      // Initialize missing properties
      ctx.session.step = ctx.session.step || "welcome";
      ctx.session.botType = "crypto";
    }
    return next();
  });

  async function notifyUserOnStatusChange(change: any) {
    const user = change.fullDocument as ICRYPTO_User;
    if (!user || !user.telegramId) return;

    if (user.status === "approved") {
      await bot.telegram.sendMessage(
        user.telegramId,
        `<b>🎉 Congratulations!</b> Your registration has been approved. ✅\n\n` +
          `🔗 <b>Welcome to Afibie Crypto Signals!</b> 🚀\n\n` +
          `👉 Click the button below to receive your exclusive invite link.\n\n` +
          `⚠️ <i>Note:</i> This link is time-sensitive and may expire soon.\n\n` +
          `🔥 <i>Enjoy your journey and happy trading!</i> 📈`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback("🔗 Click to Get Link", "get_invite_link"),
          ]).reply_markup,
        }
      );
    } else if (user.status === "rejected") {
      const isBybit = !!user.bybitUid;
      const uidType = isBybit ? "Bybit" : "Blofin";
      const userUid = isBybit ? user.bybitUid : user.blofinUid;
      const registerLink = isBybit
        ? process.env.BYBIT_LINK
        : process.env.BLOFIN_LINK;

      const caption =
        `<b>VIDEO INSTRUCTION </b>👆👆👆\n\n` +
        `<b>🚫 Application Rejected</b>\n\n` +
        `👤 <b>Your ${uidType} UID:</b> <code>${userUid}</code>\n` +
        `⚠️ <i>This UID was not registered using our affiliate link.</i>\n\n` +
        `<b>👉 What to do:</b>\n` +
        `1️⃣ <b>Create a new ${uidType} account</b> using our official affiliate link below:\n` +
        `<a href="${registerLink}">🔗 Register Here</a>\n\n` +
        `2️⃣ After registration, <b>click /start</b> to begin the process again.\n\n` +
        `🎥 <b>Need help?</b> Watch the step-by-step guide in the <b>VIDEO INSTRUCTION</b> above 👆👆👆 to register.`;

      try {
        if (VIDEO_FILE_ID) {
          await bot.telegram.sendVideo(user.telegramId, VIDEO_FILE_ID, {
            caption,
            parse_mode: "HTML",
          });
        } else {
          await bot.telegram.sendMessage(user.telegramId, caption, {
            parse_mode: "HTML",
          });
        }
      } catch (error) {
        console.error(
          "[notifyUserOnStatusChange] Error sending rejection message:",
          error
        );
      }
    }
  }

  async function watchUserStatusChanges() {
    try {
      const changeStream = CryptoUserModel.watch([], {
        fullDocument: "updateLookup",
      });
      changeStream.on("change", (change) => {
        if (
          change.operationType === "update" &&
          change.updateDescription.updatedFields?.status
        ) {
          notifyUserOnStatusChange(change);
        }
      });
    } catch (error) {
      console.error(
        "[watchUserStatusChanges] Error setting up change stream:",
        error
      );
    }
  }

  const getLinkLimiter = rateLimit({
    window: 60_000,
    limit: 3,
    onLimitExceeded: (ctx: any) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  bot.start(async (ctx) => {
    // Reset session for new start
    ctx.session = {
      step: "welcome",
      botType: "crypto"
    };

    await ctx.replyWithHTML(
      `<b>🛠 Welcome to <u>Afibie Crypto Signals</u>! 🚀</b>\n\n` +
        `📈 <i>Home of Exclusive Futures Trade Signals</i>\n\n` +
        `<b>To gain access, complete these steps:</b>\n\n` +
        `✅ <b>Step 1:</b> Solve the Captcha 🔢\n` +
        `✅ <b>Step 2:</b> Choose Your Country 🌍\n` +
        `✅ <b>Step 3:</b> Register on <b>Bybit</b> / <b>Blofin</b> and provide your <b>Login UID</b> \n` +
        `✅ <b>Step 4:</b> Wait for Verification ⏳\n\n` +
        `<i>(If you have any issues during the process, message support 👉 @Francis_Nbtc)</i>\n\n` +
        `👉 <b>Click the <b>Continue</b> button to start:</b>`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 CONTINUE", "continue_to_captcha"),
      ])
    );
  });

  bot.action("continue_to_captcha", async (ctx) => {
    if (!ctx.session) return;
    
    ctx.session.step = "captcha";
    ctx.session.captcha = generateCaptcha();

    await ctx.replyWithHTML(
      `<b>🔐 Step 1: Captcha Verification</b>\n\n` +
        `To prevent bots, please <i>solve this Captcha</i>:\n\n` +
        `👉 <b>Type this number:</b> <code>${ctx.session.captcha}</code>`
    );
  });

  bot.action("get_invite_link", getLinkLimiter, async (ctx) => {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) {
      console.error("[get_invite_link] No user ID found");
      return;
    }

    try {
      const user = await CryptoUserModel.findOne({
        telegramId: tgId,
        botType: "crypto",
      });
      if (!user || user.status !== "approved") {
        await ctx.replyWithHTML(
          `<b>⚠️ Access Denied</b>\n\n` +
            `⛔ <i>Your access link has expired or you are not yet approved.</i>\n` +
            `📩 Please contact an admin for assistance.`
        );
        return;
      }

      if (!GROUP_CHAT_ID) {
        throw new Error("GROUP_CHAT_ID is not defined");
      }

      const inviteLink = await bot.telegram.createChatInviteLink(
        GROUP_CHAT_ID,
        {
          expire_date: Math.floor(Date.now() / 1000) + 1800,
          member_limit: 1,
        }
      );
      await ctx.replyWithHTML(
        `<b>🎉 Access Granted!</b>\n\n` +
          `🔗 <b>Your Exclusive Group Link:</b>\n` +
          `<a href="${inviteLink.invite_link}">${inviteLink.invite_link}</a>\n\n` +
          `⚠️ <i>This link can only be used once and will expire in 30 minutes.</i>`
      );
      await ctx.editMessageReplyMarkup(undefined);
    } catch (error) {
      console.error("[get_invite_link] Error for user", tgId, ":", error);
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Failed to generate invite link. Please try again later or contact an admin.`
      );
    }
  });

  bot.action("cancel_final", async (ctx) => {
    if (!ctx.session) return;
    
    if (!ctx.session.step || ctx.session.step !== "final_confirmation") {
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid action. Please start over with /start.`
      );
      return;
    }

    // Reset session to initial state
    ctx.session = {
      step: "welcome",
      botType: "crypto"
    };

    await ctx.replyWithHTML(
      `<b>🛠 Registration Cancelled</b>\n\n` +
        `📌 You have cancelled the registration process.\n\n` +
        `👉 Type <b>/start</b> to begin again.`
    );
    await ctx.editMessageReplyMarkup(undefined);
  });

  bot.on(message("text"), async (ctx) => {
    if (!ctx.session) return;
    
    const text = ctx.message.text.trim();

    switch (ctx.session.step) {
      case "captcha": {
        if (verifyCaptcha(text, ctx.session.captcha || "")) {
          ctx.session.step = "captcha_confirmed";
          await ctx.replyWithHTML(
            `✅ <b>Correct!</b>\n\n` +
              `You've passed the captcha verification.\n\n` +
              `👉 Click the <b>Continue</b> button to proceed to country selection.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONTINUE", "continue_to_country"),
            ])
          );
        } else {
          const newCaptcha = generateCaptcha();
          ctx.session.captcha = newCaptcha;
          await ctx.replyWithHTML(
            `❌ <b>Incorrect Captcha</b>\n\n` +
              `🚫 Please try again:\n` +
              `👉 Type this number: <b>${newCaptcha}</b>`
          );
        }
        break;
      }

      case "country": {
        const normalized = text.trim().toLowerCase();
        ctx.session.country = text;
        const isUSA = [
          "usa",
          "us",
          "united states",
          "united states of america",
        ].includes(normalized);
        const isUK = [
          "uk",
          "united kingdom",
          "england",
          "great britain",
        ].includes(normalized);
        const isCanada = ["canada"].includes(normalized);

        if (isUSA || isUK || isCanada) {
          ctx.session.step = "blofin_confirmed";
          ctx.session.requiresBoth = false;
          await ctx.replyWithHTML(
            `<b>🌍 Country Selected: ${text}</b>\n\n` +
              `You've chosen your country.\n\n` +
              `👉 Click the <b>Continue</b> button to proceed with Blofin registration.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONTINUE", "continue_to_blofin"),
            ])
          );
        } else {
          ctx.session.step = "bybit_confirmed";
          ctx.session.requiresBoth = true;
          await ctx.replyWithHTML(
            `<b>🌍 Country Selected: ${text}</b>\n\n` +
              `You've chosen your country.\n\n` +
              `👉 Click the <b>Continue</b> button to proceed with Bybit registration. You will also need to register with Blofin.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONTINUE", "continue_to_bybit"),
            ])
          );
        }
        break;
      }

      case "bybit_uid": {
        if (!isValidUID(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid UID</b>\n\n` +
              `🚫 Enter a <b>numeric UID</b> between <b>5 to 20 digits</b>.\n\n` +
              `📌 <i>Example:</i> <code>123456789</code>`
          );
          return;
        }
        ctx.session.bybitUid = text;
        if (ctx.session.requiresBoth) {
          ctx.session.step = "blofin_confirmed";
          await ctx.replyWithHTML(
            `<b>✅ You've provided your Bybit UID.</b>\n\n` +
              `👉 Click the <b>Continue</b> button to proceed with Blofin registration.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONTINUE", "continue_to_blofin"),
            ])
          );
        } else {
          ctx.session.step = "final_confirmation";
          await ctx.replyWithHTML(
            `<b>Final Confirmation</b>\n\n` +
              `📌 <b>Your Details:</b>\n` +
              `Blofin UID: ${ctx.session.blofinUid || "Not provided"}\n\n` +
              `<b>correct?</b>\n` +
              `👉 Click <b>Confirm</b> to submit or <b>Cancel</b> to start over.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONFIRM", "confirm_final"),
              Markup.button.callback("❌ CANCEL", "cancel_final"),
            ])
          );
        }
        break;
      }

      case "blofin_uid": {
        if (!isValidUID(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid UID</b>\n\n` +
              `🚫 Enter a <b>numeric UID</b> between <b>5 to 20 digits</b>.\n\n` +
              `📌 <i>Example:</i> <code>87654321</code>`
          );
          return;
        }
        ctx.session.blofinUid = text;
        ctx.session.step = "final_confirmation";
        const details = ctx.session.requiresBoth
          ? `Bybit UID: ${ctx.session.bybitUid || "Not provided"}\nBlofin UID: ${
              ctx.session.blofinUid || "Not provided"
            }`
          : `Blofin UID: ${ctx.session.blofinUid || "Not provided"}`;
        const videoPrompt = ctx.session.bybitUid
          ? `🎥 <b>Need help?</b> Check the step-by-step Bybit registration video above.\n\n`
          : "";
        await ctx.replyWithHTML(
          `<b>✅ Blofin UID Submitted</b>\n\n` +
            `Final Confirmation\n\n` +
            `📌 <b>Your Details:</b>\n` +
            `${details}\n\n` +
            `${videoPrompt}` +
            `☑️ <b>Correct?</b>\n\n` +
            `👉 Click <b>Confirm</b> to submit or <b>Cancel</b> to start over.`,
          Markup.inlineKeyboard([
            Markup.button.callback("🔵 CONFIRM", "confirm_final"),
            Markup.button.callback("❌ CANCEL", "cancel_final"),
          ])
        );
        break;
      }
    }
  });

  bot.action("continue_to_country", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "captcha_confirmed") return;
    
    ctx.session.step = "country";
    await ctx.replyWithHTML(
      `<b>🚀 Step 2: Country Selection</b>\n\n` +
        `🌍 What is your country of residence?`,
      Markup.keyboard([["USA", "Canada", "UK"], ["Rest of the world"]])
        .oneTime()
        .resize()
    );
  });

  bot.action("continue_to_bybit", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "bybit_confirmed") return;
    
    ctx.session.step = "bybit_link";

    if (!VIDEO_FILE_ID) {
      await ctx.replyWithHTML(
        `<b>📈 Step 3: Bybit Registration</b>\n\n` +
          `<b>Why Bybit?</b>\n` +
          `📊 <i>Most Trustworthy Exchange</i>\n\n` +
          `📌 <b>Sign up here</b> 👉 <a href="${process.env.BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
          `❗ <b>IMPORTANT</b>\n\n` +
          ` If you already have a Bybit account.\n` +
          ` We can't give you access.\n` +
          `<b>✅ Once done, click the "Done" button below to continue.</b>\n\n`,
        Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_bybit")])
      );
      return;
    }

    try {
      await ctx.replyWithVideo(VIDEO_FILE_ID, {
        caption:
          `<b>VIDEO INSTRUCTION 👆👆👆</b>\n\n` +
          `<b>📈 Step 3: Bybit Registration</b>\n\n` +
          `<b>Why Bybit?</b>\n` +
          `📊 <i>Most Trustworthy Exchange</i>\n\n` +
          `📌 <b>Sign up here</b> 👉 <a href="${process.env.BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
          `❗ <b>IMPORTANT</b>\n\n` +
          ` If you already have a Bybit account.\n` +
          ` We can't give you access.\n\n` +
          `🎥 Watch the <b>VIDEO INSTRUCTION</b> above to gain access.\n\n` +
          `✅ Once done, click the <b>Done</b> button to continue.`,
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback("🔵 Done", "done_bybit"),
        ]).reply_markup,
      });
    } catch (error) {
      console.error("[continue_to_bybit] Error sending video:", error);
      await ctx.replyWithHTML(
        `<b>📈 Step 3: Bybit Registration</b>\n\n` +
          `<b>Why Bybit?</b>\n` +
          `📊 <i>Most Trustworthy Exchange</i>\n\n` +
          `📌 <b>Sign up here</b> 👉 <a href="${process.env.BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
           `❗ <b>IMPORTANT</b>\n\n` +
          ` If you already have a Bybit account.\n` +
          ` We can't give you access.\n` +
          `❌ Video unavailable. Please try again later or contact support.\n\n` +
          `✅ Once done, click the <b>Done</b> button to continue.`,
        Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_bybit")])
      );
    }
  });

  bot.action("continue_to_blofin", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "blofin_confirmed") return;
    
    ctx.session.step = "blofin_link";
    // Dynamically set step number: 3 for USA/UK/Canada (requiresBoth = false), 4 for others
    const stepNumber = ctx.session.requiresBoth ? 4 : 3;

    await ctx.replyWithHTML(
      `<b>🚀 Step ${stepNumber}: Blofin Registration</b>\n\n` +
        `<b>Why Blofin?</b>\n` +
        `🌍 <i>Global Access</i> - <u>No KYC required!</u>\n\n` +
        `📌 <b>Sign up here</b> 👉 <a href="${process.env.BLOFIN_LINK}">Blofin Registration Link</a>\n\n` +
        `✅ After registering, click the <b>Done</b> button to continue.`,
      Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_blofin")])
    );
  });

  bot.action("done_bybit", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "bybit_link") return;
    
    ctx.session.step = "bybit_uid";
    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Bybit UID</b>\n\n` +
        `Please enter your <b>Bybit UID</b> below to proceed.\n\n` +
        `💡 <i>You can find your UID in the account/profile section of the Bybit app or website.</i>\n\n` +
        `📌 <b>Example:</b> <code>12345678</code>`
    );
  });

  bot.action("done_blofin", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "blofin_link") return;
    
    ctx.session.step = "blofin_uid";
    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Blofin UID</b>\n\n` +
        `Please enter your <b>Blofin UID</b> below to continue.\n\n` +
        `💡 <i>You can find your UID in the account section of the Blofin platform after logging in.</i>\n\n` +
        `📌 <b>Example:</b> <code>87654321</code>`
    );
  });

  bot.action("confirm_final", async (ctx) => {
    if (!ctx.session) return;
    
    if (!ctx.session.step || ctx.session.step !== "final_confirmation") {
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start or try again.`
      );
      return;
    }

    try {
      await saveAndNotify(ctx);
      ctx.session.step = "final";
    } catch (error: any) {
      console.error(`[confirm_final] Error:`, error);
      let errorMessage =
        "🚫 Failed to submit your details. Please try again or contact an admin.";
      if (error.message.includes("MONGODB_URI")) {
        errorMessage =
          "🚫 Server configuration error (database). Please contact an admin.";
      } else if (error.message.includes("GROUP_CHAT_ID")) {
        errorMessage =
          "🚫 Server configuration error (group chat). Please contact an admin.";
      } else if (error.message.includes("Country is missing")) {
        errorMessage =
          "🚫 Missing country information. Please start over with /start.";
      } else if (error.message.includes("UID must be provided")) {
        errorMessage =
          "🚫 No Bybit or Blofin UID provided. Please start over with /start.";
      } else if (
        error.name === "MongooseError" ||
        error.name === "MongoServerError"
      ) {
        errorMessage =
          "🚫 Database connection issue. Please try again later or contact an admin.";
      }
      await ctx.replyWithHTML(`<b>⚠️ Error</b>\n\n${errorMessage}`);
    }
  });

  async function saveAndNotify(ctx: any) {
    if (!ctx.session || !ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    try {
      console.log(
        `[saveAndNotify] Processing for user ${telegramId}, session:`,
        ctx.session
      );

      if (!ctx.session.country) {
        throw new Error("Country is missing in session data");
      }
      if (!ctx.session.bybitUid && !ctx.session.blofinUid) {
        throw new Error("At least one UID (Bybit or Blofin) must be provided");
      }

      const updatePayload: Partial<ICRYPTO_User> = {
        telegramId,
        username: ctx.from.username || "unknown",
        fullName:
          `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() ||
          "Unknown User",
        botType: "crypto",
        country: ctx.session.country,
        status: "pending",
      };

      if (ctx.session.bybitUid) {
        updatePayload.bybitUid = ctx.session.bybitUid;
        updatePayload.registeredVia = ctx.session.requiresBoth ? "both" : "bybit";
      }
      if (ctx.session.blofinUid) {
        updatePayload.blofinUid = ctx.session.blofinUid;
        if (!ctx.session.bybitUid) {
          updatePayload.registeredVia = "blofin";
        }
      }

      console.log(
        `[saveAndNotify] Saving user data for ${telegramId}:`,
        updatePayload
      );

      const user = await CryptoUserModel.findOneAndUpdate(
        { telegramId, botType: "crypto" },
        updatePayload,
        { upsert: true, new: true, maxTimeMS: 20000 }
      );

      console.log(`[saveAndNotify] User saved successfully:`, user);

      await ctx.replyWithHTML(
        `<b>✅ Submission Successful!</b>\n\n` +
          `⏳ <b>Please wait</b> while your details are being reviewed (Allow 24 hours).\n\n` +
          `📌 <i>You will receive a link to join the signal channel once approved.</i>\n\n`
      );

      console.log(`[saveAndNotify] Sending admin alert for user ${telegramId}`);
      await sendAdminAlertCrypto(user);
      console.log(
        `[saveAndNotify] Admin alert sent successfully for user ${telegramId}`
      );
    } catch (error) {
      console.error(`[saveAndNotify] Error for user ${telegramId}:`, error);
      throw error;
    }
  }

  watchUserStatusChanges();


bot.on('video', async (ctx) => {
  try {
    const video = ctx.message.video;
    if (!video) return;

    const fileId = video.file_id;
    console.log('Received Video File ID:', fileId);

    await ctx.replyWithHTML(
      `<b>🎥 Video received!</b>\n\n` +
      `<b>File ID:</b>\n<code>${fileId}</code>\n\n` +
      `✅ Save this ID in your environment variables to reuse the video.`
    );
  } catch (error) {
    console.error('Error handling video:', error);
    await ctx.reply('❌ Failed to process the video. Please try again.');
  }
});


  bot.catch((err, ctx) => {
    console.error(
      `🚨 Crypto Bot Error for update ${ctx.update.update_id}:`,
      err
    );
    ctx.reply("❌ An error occurred. Please try again later.");
  });
}