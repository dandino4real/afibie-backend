
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { ICRYPTO_User, CryptoUserModel } from "../models/crypto_user.model";
import { sendAdminAlertCrypto } from "../utils/services/notifier-crypto";
import { generateCaptcha, verifyCaptcha } from "../utils/captcha";
import { isValidBybitUID, isValidWeexUID } from "../utils/validate";
import rateLimit from "telegraf-ratelimit";
import { BotContext } from "../telegrafContext";
import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const VIDEO_FILE_ID = process.env.BYBIT_VIDEO_FILE_ID;
const GROUP_CHAT_ID = process.env.CRYPTO_GROUP_CHAT_ID;
const WEEX_LINK = process.env.WEEX_LINK;
const BYBIT_LINK = process.env.BYBIT_LINK;
const WEEX_GIF_FILE_ID = process.env.WEEX_GIF_FILE_ID;
const BYBIT_GIF_FILE_ID = process.env.BYBIT_GIF_FILE_ID;

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL!);

export default function (bot: Telegraf<BotContext>) {
  // Initialize session properties
  bot.use((ctx, next) => {
    if (!ctx.session) {
      ctx.session = {
        step: "welcome",
        botType: "crypto",
        retryCount: 0,
      };
    } else {
      ctx.session.step = ctx.session.step || "welcome";
      ctx.session.botType = "crypto";
      ctx.session.retryCount = ctx.session.retryCount || 0;
    }
    return next();
  });

  const getLinkLimiter = rateLimit({
    window: 60_000,
    limit: 3,
    onLimitExceeded: (ctx: any) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  // Bot start
  bot.start(async (ctx) => {
    // Reset session for new start
    ctx.session = {
      step: "welcome",
      botType: "crypto",
      retryCount: 0,
    };

    // Save session to Redis
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🛠 Welcome to Afibie Crypto Signal! 🚀</b>\n\n` +
        `📈 You’re about to join <b>18,000+ traders already cashing out every single week</b>\n\n` +
        `<b>To Unlock access 👇</b>\n\n` +
        `✅ <b>Step 1:</b> Solve the Captcha 🔢\n` +
        `✅ <b>Step 2:</b> Choose Your Country 🌍\n` +
        `✅ <b>Step 3:</b> Register at Bybit or Weex and provide your UID \n` +
        `✅ <b>Step 4:</b> Gain Access ⏳\n\n` +
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

    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🔐 Step 1: Captcha Verification</b>\n\n` +
        `To prevent bots, please solve this Captcha to continue.\n\n` +
        `👉 Type this number: <code>${ctx.session.captcha}</code>`
    );
  });

  bot.action("continue_to_country", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "captcha_confirmed") return;

    ctx.session.step = "country";
    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🚀 Step 2: Country Selection</b>\n\n` +
        `🌍 What is your country of residence?`,
      Markup.keyboard([["USA", "Canada", "UK"], ["Rest of the world"]])
        .oneTime()
        .resize()
    );
  });

  bot.action("has_bybit_yes", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "has_bybit_account") return;

    ctx.session.hasBybitAccount = true;
    ctx.session.step = "weex_link";
    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🚀 Step 3: Weex Registration</b>\n\n` +
        `<b>Why Weex?</b>\n` +
        `🌎 <i>Global access – No KYC required!</i>\n\n` +
        `📌 <b>Sign up here</b> 👉 <a href="${WEEX_LINK}">Weex Registration Link</a>\n\n` +
        `✅ Click <b>Done</b> after completing your registration!`,
      Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_weex")])
    );
  });

  bot.action("has_bybit_no", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "has_bybit_account") return;

    ctx.session.hasBybitAccount = false;
    ctx.session.step = "bybit_link";
    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    if (!VIDEO_FILE_ID) {
      await ctx.replyWithHTML(
        `<b>📈 Step 3: Bybit Registration</b>\n\n` +
          `<b>Why Bybit?</b>\n` +
          `📊 <i>Most Trustworthy Exchange</i>\n\n` +
          `📌 <b>Sign up here</b> 👉 <a href="${BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
          `✅ Click <b>Done</b> after completing your registration!`,
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
          `📌 <b>Sign up here</b> 👉 <a href="${BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
          `✅ Click <b>Done</b> after completing your registration!`,
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback("🔵 Done", "done_bybit"),
        ]).reply_markup,
      });
    } catch (error) {
      console.error("[has_bybit_no] Error sending video:", error);
      await ctx.replyWithHTML(
        `<b>📈 Step 3: Bybit Registration</b>\n\n` +
          `<b>Why Bybit?</b>\n` +
          `📊 <i>Most Trustworthy Exchange</i>\n\n` +
          `📌 <b>Sign up here</b> 👉 <a href="${BYBIT_LINK}">Bybit Registration Link</a>\n\n` +
          `❌ Video unavailable. Please try again later or contact support.\n` +
          `✅ Click <b>Done</b> after completing your registration!`,
        Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_bybit")])
      );
    }
  });

  bot.action("done_bybit", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "bybit_link") return;

    ctx.session.step = "bybit_uid";
    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    const caption =
      `<b>🔹 Submit Your Bybit UID</b>\n\n` +
      `Please enter your <b>Bybit UID</b> below to proceed.\n\n` +
      `💡 <i>You can find your UID in the account/profile section of the Bybit app or website.</i>\n\n` +
      `📌 <i>Example:</i> <code>123456789</code>`;

    if (BYBIT_GIF_FILE_ID) {
      try {
        await ctx.replyWithAnimation(BYBIT_GIF_FILE_ID, {
          caption,
          parse_mode: "HTML",
        });
      } catch (error) {
        console.error("[done_bybit] Error sending GIF:", error);
        await ctx.replyWithHTML(caption);
      }
    } else {
      await ctx.replyWithHTML(caption);
    }
  });

  bot.action("done_weex", async (ctx) => {
    if (!ctx.session || ctx.session.step !== "weex_link") return;

    ctx.session.step = "weex_uid";
    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    const caption =
      `<b>🔹 Submit Your Weex UID</b>\n\n` +
      `Please enter your <b>Weex UID</b> below to continue.\n\n` +
      `💡 <i>You can find your UID in the account section of the Weex platform after logging in.</i>\n\n` +
      `📌 <i>Example:</i> <code>4321949</code>`;

    if (WEEX_GIF_FILE_ID) {
      try {
        await ctx.replyWithAnimation(WEEX_GIF_FILE_ID, {
          caption,
          parse_mode: "HTML",
        });
      } catch (error) {
        console.error("[done_weex] Error sending GIF:", error);
        await ctx.replyWithHTML(caption);
      }
    } else {
      await ctx.replyWithHTML(caption);
    }
  });

  bot.action("confirm_final", getLinkLimiter, async (ctx) => {
    if (!ctx.session || ctx.session.step !== "final_confirmation") {
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start or try again.`
      );
      return;
    }

    try {
      await saveAndNotify(ctx);
      ctx.session.step = "final";
      // Update Redis session
      const sessionKey = `crypto:${ctx.from.id}`;
      await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
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
          "🚫 No UID provided. Please start over with /start.";
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
      botType: "crypto",
      retryCount: ctx.session.retryCount || 0,
    };

    // Update Redis session
    const sessionKey = `crypto:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

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
          // Update Redis session
          const sessionKey = `crypto:${ctx.from.id}`;
          await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

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
          // Update Redis session
          const sessionKey = `crypto:${ctx.from.id}`;
          await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

          await ctx.replyWithHTML(
            `❌ <b>Incorrect Captcha</b>\n\n` +
              `🚫 Please try again:\n` +
              `👉 Type this number: <code>${newCaptcha}</code>`
          );
        }
        break;
      }

      case "country": {
        const normalized = text.trim().toLowerCase();
        ctx.session.country = text;
        const isRestricted = ["usa", "canada", "uk", "united states", "united kingdom"].includes(normalized);

        // Update Redis session
        const sessionKey = `crypto:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

        if (isRestricted) {
          ctx.session.step = "weex_link";
          await ctx.replyWithHTML(
            `<b>🌍 Country Selected: ${text}</b>\n\n` +
              `<b>🚀 Step 3: Weex Registration</b>\n\n` +
              `<b>Why Weex?</b>\n` +
              `🌎 <i>Global access – No KYC required!</i>\n\n` +
              `📌 <b>Sign up here</b> 👉 <a href="${WEEX_LINK}">Weex Registration Link</a>\n\n` +
              `✅ Click <b>Done</b> after completing your registration!`,
            Markup.inlineKeyboard([Markup.button.callback("🔵 Done", "done_weex")])
          );
        } else {
          ctx.session.step = "has_bybit_account";
          await ctx.replyWithHTML(
            `<b>🌍 Country Selected: ${text}</b>\n\n` +
              `<b>Step 3: Exchange Registration</b>\n\n` +
              `Do you have a Bybit account?`,
            Markup.inlineKeyboard([
              Markup.button.callback("✅ Yes", "has_bybit_yes"),
              Markup.button.callback("❌ No", "has_bybit_no"),
            ])
          );
        }
        break;
      }

      case "bybit_uid": {
        if (!isValidBybitUID(text)) {
          const caption =
            `❌ <b>Invalid UID</b>\n\n` +
            `🚫 Enter a <b>numeric UID</b> between <b>8 to 10 digits</b>.\n\n` +
            `📌 <i>Example:</i> <code>123456789</code>\n\n` +
            `💡 <i>You can find your UID in the account/profile section of the Bybit app or website.</i>`;

          if (BYBIT_GIF_FILE_ID) {
            try {
              await ctx.replyWithAnimation(BYBIT_GIF_FILE_ID, {
                caption,
                parse_mode: "HTML",
              });
            } catch (error) {
              console.error("[bybit_uid] Error sending GIF:", error);
              await ctx.replyWithHTML(caption);
            }
          } else {
            await ctx.replyWithHTML(caption);
          }
          return;
        }
        ctx.session.bybitUid = text;
        ctx.session.step = "final_confirmation";
        // Update Redis session
        const sessionKey = `crypto:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

        await ctx.replyWithHTML(
          `<b>✅ UID Validated Successfully!</b>\n\n` +
            `<b>Final Confirmation</b>\n\n` +
            `📌 <b>Your Details:</b>\n` +
            `Bybit UID: ${ctx.session.bybitUid}\n\n` +
            `☑️ <b>Correct?</b>\n\n` +
            `👉 Click <b>Confirm</b> to submit or <b>Cancel</b> to start over.`,
          Markup.inlineKeyboard([
            Markup.button.callback("🔵 CONFIRM", "confirm_final"),
            Markup.button.callback("❌ CANCEL", "cancel_final"),
          ])
        );
        break;
      }

      case "weex_uid": {
        if (!isValidWeexUID(text)) {
          const caption =
            `❌ <b>Invalid UID</b>\n\n` +
            `🚫 Enter a <b>numeric UID</b> between <b>11 to 13 digits</b>.\n\n` +
            `📌 <i>Example:</i> <code>87654321949</code>\n\n` +
            `💡 <i>You can find your UID in the account section of the Weex platform after logging in.</i>`;

          if (WEEX_GIF_FILE_ID) {
            try {
              await ctx.replyWithAnimation(WEEX_GIF_FILE_ID, {
                caption,
                parse_mode: "HTML",
              });
            } catch (error) {
              console.error("[weex_uid] Error sending GIF:", error);
              await ctx.replyWithHTML(caption);
            }
          } else {
            await ctx.replyWithHTML(caption);
          }
          return;
        }
        ctx.session.weexUid = text;
        ctx.session.step = "final_confirmation";
        // Update Redis session
        const sessionKey = `crypto:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

        await ctx.replyWithHTML(
          `<b>✅ UID Validated Successfully!</b>\n\n` +
            `<b>Final Confirmation</b>\n\n` +
            `📌 <b>Your Details:</b>\n` +
            `Weex UID: ${ctx.session.weexUid}\n\n` +
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
      if (!ctx.session.weexUid && !ctx.session.bybitUid) {
        throw new Error("UID must be provided");
      }

      const updatePayload: Partial<ICRYPTO_User> = {
        telegramId,
        username: ctx.from.username || "unknown",
        fullName:
          `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() ||
          "Unknown User",
        botType: "crypto",
        country: ctx.session.country,
        status: "approved",
      };

      if (ctx.session.weexUid) {
        updatePayload.weexUid = ctx.session.weexUid;
        updatePayload.registeredVia = "weex";
      } else if (ctx.session.bybitUid) {
        updatePayload.bybitUid = ctx.session.bybitUid;
        updatePayload.registeredVia = "bybit";
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
        `<b>🎉 All information has been validated and stored successfully!</b>\n\n` +
          `🔗 <b>Welcome to Afibie Signal Group! 🚀</b>\n` +
          `Here’s your exclusive access link:\n` +
          `<a href="${inviteLink.invite_link}">${inviteLink.invite_link}</a>\n\n` +
          `⚠️ <i>Note: This link is time-sensitive and will expire if not used promptly.</i>\n` +
          `Enjoy your journey & happy trading! 📈🔥`
      );

      // await sendAdminAlertCrypto(user);
      console.log(
        `[saveAndNotify] Admin alert sent successfully for user ${telegramId}`
      );
    } catch (error) {
      console.error(`[saveAndNotify] Error for user ${telegramId}:`, error);
      throw error;
    }
  }

  bot.on("animation", async (ctx) => {
    try {
      const animation = ctx.message.animation;
      if (!animation) return;

      const fileId = animation.file_id;
      console.log("Received GIF File ID:", fileId);

      await ctx.replyWithHTML(
        `<b>🎞️ GIF received!</b>\n\n` +
          `<b>File ID:</b>\n<code>${fileId}</code>\n\n` +
          `✅ Save this ID in your environment variables (e.g., BYBIT_GIF_FILE_ID or WEEX_GIF_FILE_ID) to reuse the GIF.`
      );
    } catch (error) {
      console.error("Error handling GIF:", error);
      await ctx.reply("❌ Failed to process the GIF. Please try again.");
    }
  });

  bot.on("video", async (ctx) => {
    try {
      const video = ctx.message.video;
      if (!video) return;

      const fileId = video.file_id;
      console.log("Received Video File ID:", fileId);

      await ctx.replyWithHTML(
        `<b>🎥 Video received!</b>\n\n` +
          `<b>File ID:</b>\n<code>${fileId}</code>\n\n` +
          `✅ Save this ID in your environment variables to reuse the video.`
      );
    } catch (error) {
      console.error("Error handling video:", error);
      await ctx.reply("❌ Failed to process the video. Please try again.");
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