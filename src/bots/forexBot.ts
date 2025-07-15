

// src/bots/forexBot.ts
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { IFOREX_User, ForexUserModel } from "../models/forex_user.model";
import { sendAdminAlertForex } from "../utils/services/notifier-forex";
import { generateCaptcha, verifyCaptcha } from "../utils/captcha";
import { isValidLoginID } from "../utils/validate";
import rateLimit from "telegraf-ratelimit";
import { createLogger, transports, format } from "winston";
import { BotContext } from "../telegrafContext";
import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const GROUP_CHAT_ID = process.env.FOREX_GROUP_CHAT_ID;
const logger = createLogger({
  level: "warn",
  transports: [
    new transports.Console({
      format: format.combine(format.timestamp(), format.simple()),
    }),
  ],
});

// Create Redis client
const redis = new Redis(process.env.REDIS_URL!);

export default function (bot: Telegraf<BotContext>) {
  // Initialize session properties
  bot.use((ctx, next) => {
    // Ensure session exists and has required properties
    if (!ctx.session) {
      ctx.session = {
        step: "welcome",
        botType: "forex",
        retryCount: 0
      };
    } else {
      // Initialize missing properties
      ctx.session.step = ctx.session.step || "welcome";
      ctx.session.botType = "forex";
      ctx.session.retryCount = ctx.session.retryCount || 0;
    }
    return next();
  });

  const getLinkLimiter = rateLimit({
    window: 60_000,
    limit: 3,
    onLimitExceeded: (ctx) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  // Notify user on status change
  async function notifyUserOnStatusChange(change: any) {
    const user = change.fullDocument as IFOREX_User;
    if (!user || !user.telegramId) return;

    if (user.status === "approved") {
      await bot.telegram.sendMessage(
        user.telegramId,
        `<b>🎉 Congratulations!</b> Your registration has been approved. ✅\n\n` +
          `🔗 <b>Welcome to Afibie Fx Signals!</b> 🚀\n\n` +
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
      try {
        // Get session from Redis
        const sessionKey = `forex:${user.telegramId}`;
        const sessionData = await redis.get(sessionKey);
        let session = sessionData ? JSON.parse(sessionData) : null;

        // Initialize session if not found
        if (!session) {
          session = {
            botType: "forex",
            retryCount: 0,
            step: "login_id",
          };
        }

        if (session.retryCount >= 1) {
          await bot.telegram.sendMessage(
            user.telegramId,
            `<b>❌ Sorry, your registration was rejected.</b>\n\n` +
              `🚫 You have exceeded the maximum retry attempts.\n` +
              `📩 Please contact an admin for assistance.`,
            { parse_mode: "HTML" }
          );
          return;
        }

        // Update session
        session.step = "login_id";
        session.retryCount = (session.retryCount || 0) + 1;
        
        // Save updated session to Redis
        await redis.set(sessionKey, JSON.stringify(session), "EX", 86400); // 24h TTL

        const reasonMessage =
          user.rejectionReason === "no_affiliate_link"
            ? "Your Exco Trader account was not registered using our affiliate link."
            : user.rejectionReason === "insufficient_deposit"
            ? "Your Exco Trader account does not have a minimum deposit of $100."
            : "No specific reason provided.";

        const nextSteps =
          user.rejectionReason === "no_affiliate_link"
            ? `To gain access to Afibie FX signals, register a new Exco Trader account using our affiliate link:\n\n` +
              `👉 <a href="${process.env.EXCO_LINK}">Exco Trader Registration Link</a>\n\n` +
              `Once registered, click /start to begin again.`
            : user.rejectionReason === "insufficient_deposit"
            ? `To proceed, please deposit at least $100 into your Exco Trader account.\n\n` +
              `Once deposited, click /start to begin again.`
            : `Please contact an admin for assistance on next steps.`;

        const rejectionMessage =
          `<b>❌ Your registration was rejected.</b>\n\n` +
          `👤 <b>Your Exco Trader Login ID:</b> <code>${
            user.excoTraderLoginId || "N/A"
          }</code>\n` +
          `⚠️ <b>Reason:</b> ${reasonMessage}\n\n` +
          `📌 <b>This is your last trial.</b>\n\n` +
          `${nextSteps}\n\n`;

        await bot.telegram.sendMessage(user.telegramId, rejectionMessage, {
          parse_mode: "HTML",
        });
      } catch (error) {
        console.error("Error handling rejection notification:", error);
      }
    }
  }

  // Watch for status changes in MongoDB
  async function watchUserStatusChanges() {
    try {
      const changeStream = ForexUserModel.watch([], {
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

  bot.start(async (ctx) => {
    // Reset session for new start
    ctx.session = {
      step: "welcome",
      botType: "forex",
      retryCount: 0
    };

    // Save session to Redis
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🛠 Welcome to <u>Afibie FX Signal</u>! 🚀</b>\n\n` +
        `📈 <i>Home of <b>Exclusive FOREX signals</b></i>\n\n` +
        `<b>To gain access, complete these steps 👇</b>\n\n` +
        `✅ <b>Step 1:</b> Solve the Captcha 🔢\n` +
        `✅ <b>Step 2:</b> Register at Exco Trader, deposit <b>$100</b> or more, and provide your <b>Login ID</b> 💰\n` +
        `✅ <b>Step 3:</b> Create Deriv account (Optional) 📊\n\n` +
        `⏳ <b>Once all steps are completed, you will gain full access to Afibie FX Signals - where strategy meets profitability!</b> 💰📊\n\n` +
         `<i>(If you have any issues during the process, message support 👉 @Francis_Nbtc)</i>\n\n` +
        `👉 Click <b>CONTINUE</b> to start:`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 CONTINUE", "continue_to_captcha"),
      ])
    );
  });

  bot.action("continue_to_captcha", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session) return;
    
    if (ctx.session.step !== "welcome") {
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    ctx.session.step = "captcha";
    ctx.session.captcha = generateCaptcha();

    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>🔐 Step 1: Captcha Verification</b>\n\n` +
        `To prevent bots, please <i>solve this Captcha</i>:\n\n` +
        `👉 <b>Type this number:</b> <code>${ctx.session.captcha}</code>`
    );
  });

  bot.action("get_invite_link", getLinkLimiter, async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      logger.error("[get_invite_link] No user ID found");
      return;
    }

    try {
      const user = await ForexUserModel.findOne({
        telegramId,
        botType: "forex",
      });
      if (!user || user.status !== "approved") {
        logger.warn("Unauthorized get_invite_link attempt", { telegramId });
        await ctx.replyWithHTML(
          `⚠️ Your access link has expired or you are not yet approved.\n` +
            `📩 Please contact an admin.`
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
        `<b>🔗 Welcome to Afibie FX Signals! 🚀</b>\n\n` +
          `Here's your exclusive access link: <a href="${inviteLink.invite_link}">${inviteLink.invite_link}</a>\n\n` +
          `⚠️ <b>Note:</b> This link is time-sensitive and will expire in 30 minutes.\n` +
          `Enjoy your journey & happy trading! 📈🔥`
      );
    } catch (error) {
      logger.error("Error generating invite link", { telegramId, error });
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Failed to generate invite link. Please try again later or contact an admin.`
      );
    }
  });

  bot.action("confirm_final", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session) return;
    
    if (ctx.session.step !== "final_confirmation") {
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    try {
      await saveAndNotify(ctx);
      ctx.session.step = "final";
      
      // Update Redis session
      const sessionKey = `forex:${ctx.from.id}`;
      await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    } catch (error: any) {
      logger.error(`[confirm_final] Error:`, error);
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
      } else if (error.message.includes("Exco Trader Login ID is missing")) {
        errorMessage =
          "🚫 No Exco Trader Login ID provided. Please start over with /start.";
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
    await ctx.answerCbQuery();
    if (!ctx.session) return;
    
    // Reset to clean state
    ctx.session = {
      step: "welcome",
      botType: "forex",
      retryCount: 0
    };

    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
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
          const sessionKey = `forex:${ctx.from.id}`;
          await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
          
          await ctx.replyWithHTML(
            `✅ <b>Correct!</b>\n\n` +
              `You've passed the captcha verification.\n\n` +
              `👉 Click <b>CONTINUE</b> to proceed to country selection.`,
            Markup.inlineKeyboard([
              Markup.button.callback("🔵 CONTINUE", "continue_to_country"),
            ])
          );
        } else {
          const newCaptcha = generateCaptcha();
          ctx.session.captcha = newCaptcha;
          
          // Update Redis session
          const sessionKey = `forex:${ctx.from.id}`;
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
        ctx.session.country = text;
        ctx.session.step = "waiting_for_done";
        
        // Update Redis session
        const sessionKey = `forex:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
        
        await ctx.replyWithHTML(
          `<b>🌍 Step 2: Exco Trader Registration</b>\n\n` +
            `📌 <b>Sign up here</b> 👉 <a href="${process.env.EXCO_LINK}">Exco Trader Registration Link</a>\n\n` +
            `✅ Click <b>Done</b> after completing your registration!\n\n` +
            `📌 <b>Deposit Requirement:</b>\n` +
            `⚡ To gain access, deposit at least <b>$100</b> into your Exco Trader account.\n\n` +
            `💬 <i>Note: The Exco team may contact you to assist with setting up your account.</i>\n\n` +
            `📌 <b>Submit Exco Trader Login ID</b>\n` +
            `🔹 Check your email for your Login ID.\n` +
            `🔹 Enter your Login ID below after clicking Done.`,
          Markup.inlineKeyboard([
            Markup.button.callback("✅ Done", "done_exco"),
          ])
        );
        break;
      }

      case "exco_login": {
        if (!isValidLoginID(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid Login ID</b>\n\n` +
              `🚫 Please enter a valid alphanumeric Login ID (5-20 characters).\n` +
              `📌 <b>Example:</b> <code>123456565</code>`
          );
          return;
        }
        ctx.session.excoTraderLoginId = text;
        ctx.session.step = "exco_confirmed";
        
        // Update Redis session
        const sessionKey = `forex:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
        
        await ctx.replyWithHTML(
          `<b>✅ You've provided your Exco Trader Login ID!</b>\n\n` +
            `👉 Click <b>CONTINUE</b> to proceed to Deriv registration (optional).`,
          Markup.inlineKeyboard([
            Markup.button.callback("🔵 CONTINUE", "continue_to_deriv"),
          ])
        );
        break;
      }

      case "deriv": {
        if (!isValidLoginID(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid Deriv Login ID</b>\n\n` +
              `🚫 Please enter a valid alphanumeric Login ID (5-20 characters).\n` +
              `📌 <b>Example:</b> <code>DR123456</code>`
          );
          return;
        }
        ctx.session.derivLoginId = text;
        ctx.session.step = "final_confirmation";
        
        // Update Redis session
        const sessionKey = `forex:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
        
        const details = [
          `Exco Trader Login ID: ${
            ctx.session.excoTraderLoginId || "Not provided"
          }`,
          ctx.session.derivLoginId
            ? `Deriv Login ID: ${ctx.session.derivLoginId}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

        await ctx.replyWithHTML(
          `<b>Final Confirmation</b>\n\n` +
            `📌 <b>Your Details:</b>\n` +
            `${details}\n\n` +
            `⚠️ <b>Not correct?</b> Type <b>/start</b> to restart the process.\n\n` +
            `👉 Click <b>Confirm</b> to submit or <b>Cancel</b> to start over.`,
          Markup.inlineKeyboard([
            Markup.button.callback("🔵 CONFIRM", "confirm_final"),
            Markup.button.callback("❌ CANCEL", "cancel_final"),
          ])
        );
        break;
      }

      case "login_id": {
        if (!isValidLoginID(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid Login ID</b>\n\n` +
              `🚫 Please enter a valid alphanumeric Login ID (5-20 characters).\n` +
              `📌 <b>Example:</b> <code>EX123456</code>`
          );
          return;
        }
        ctx.session.excoTraderLoginId = text;
        ctx.session.step = "exco_confirmed";
        
        // Update Redis session
        const sessionKey = `forex:${ctx.from.id}`;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
        
        await ctx.replyWithHTML(
          `<b>✅ You've provided your Exco Trader Login ID!</b>\n\n` +
            `👉 Click <b>CONTINUE</b> to proceed to Deriv registration (optional).`,
          Markup.inlineKeyboard([
            Markup.button.callback("🔵 CONTINUE", "continue_to_deriv"),
          ])
        );
        break;
      }
    }
  });

  bot.action("continue_to_country", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session || ctx.session.step !== "captcha_confirmed") return;
    
    ctx.session.step = "country";
    
    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    
    await ctx.replyWithHTML(
      `<b>🌍 Country Selection</b>\n\n` + `What is your country of residence?`,
      Markup.keyboard([["USA", "Canada", "UK"], ["Rest of the world"]])
        .oneTime()
        .resize()
    );
  });

  bot.action("done_exco", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session || ctx.session.step !== "waiting_for_done") return;
    
    ctx.session.step = "exco_login";
    
    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    
    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Exco Trader Login ID</b>\n\n` +
        `Please enter your <b>Exco Trader Login ID</b> below.\n\n` +
        `💡 <i>You can find it in the welcome email from Exco Trader.</i>\n` +
        `📌 <b>Example:</b> <code>123456456</code>`
    );
  });

  bot.action("continue_to_deriv", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session || ctx.session.step !== "exco_confirmed") return;
    
    ctx.session.step = "deriv";
    
    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    
    await ctx.replyWithHTML(
      `<b>📌 Step 3: Deriv Registration (Optional)</b>\n\n` +
        `We also give synthetic signals.\n` +
        `Create a Deriv account to take Synthetic Trades 👉 <a href="${
          process.env.DERIV_LINK || "https://fxht.short.gy/DeTGB"
        }">Deriv Registration Link</a>\n\n` +
        `✅ Click <b>Done</b> after registration, or <b>Skip</b> to proceed.`,
      Markup.inlineKeyboard([
        Markup.button.callback("✅ Done", "done_deriv"),
        Markup.button.callback("⏭ Skip", "done_deriv"),
      ])
    );
  });

  bot.action("done_deriv", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session || ctx.session.step !== "deriv") return;
    
    ctx.session.step = "final_confirmation";
    
    // Update Redis session
    const sessionKey = `forex:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    
    const details = [
      `Exco Trader Login ID: ${ctx.session.excoTraderLoginId || "Not provided"}`,
      ctx.session.derivLoginId ? `Deriv Login ID: ${ctx.session.derivLoginId}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await ctx.replyWithHTML(
      `<b>Final Confirmation</b>\n\n` +
        `📌 <b>Your Details:</b>\n` +
        `${details}\n\n` +
        `☑️ <b>Correct?</b>\n\n` +
        `👉 Click <b>Confirm</b> to submit or <b>Cancel</b> to start over.`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 CONFIRM", "confirm_final"),
        Markup.button.callback("❌ CANCEL", "cancel_final"),
      ])
    );
  });

  bot.action("continue_to_login_id", async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session || ctx.session.step !== "login_id") return;
    
    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Exco Trader Login ID</b>\n\n` +
        `Please enter your <b>Exco Trader Login ID</b> below.\n\n` +
        `💡 <i>You can find it in the welcome email from Exco Trader.</i>\n` +
        `📌 <b>Example:</b> <code>5677123456</code>`
    );
  });

  async function saveAndNotify(ctx: any) {
    if (!ctx.session || !ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    try {
      if (!ctx.session.country) {
        throw new Error("Country is missing in session data");
      }
      if (!ctx.session.excoTraderLoginId) {
        throw new Error("Exco Trader Login ID is missing");
      }

      const updatePayload: Partial<IFOREX_User> = {
        telegramId,
        username: ctx.from.username || "unknown",
        fullName:
          `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() ||
          "Unknown User",
        botType: "forex",
        country: ctx.session.country,
        excoTraderLoginId: ctx.session.excoTraderLoginId,
        status: "pending",
        // retryCount: ctx.session.retryCount || 0
      };

      const user = await ForexUserModel.findOneAndUpdate(
        { telegramId, botType: "forex" },
        updatePayload,
        { upsert: true, new: true, maxTimeMS: 20000 }
      );

      await ctx.replyWithHTML(
        `<b>✅ Submission Successful!</b>\n\n` +
          `⏳ <b>Please wait</b> while your details are being reviewed (Allow 24 hours).\n\n` +
          `📌 <i>You will receive a link to join the signal channel once approved.</i>\n\n`
      );

      await sendAdminAlertForex(user);
    } catch (error) {
      logger.error(`[saveAndNotify] Error for user ${telegramId}:`, error);
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Failed to submit your details. Please try again later or contact an admin.`
      );
      throw error;
    }
  }

  watchUserStatusChanges();

  bot.catch((err, ctx) => {
    console.error(
      `🚨 Forex Bot Error for update ${ctx.update.update_id}:`,
      err
    );
    ctx.reply("❌ An error occurred. Please try again later.");
  });
}