

import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { IFOREX_User, ForexUserModel } from "../models/forex_user.model";
import { sendAdminAlertForex } from "../utils/services/notifier-forex";
import { generateCaptcha, verifyCaptcha } from "../utils/captcha";
import { isValidLoginID } from "../utils/validate";
import rateLimit from "telegraf-ratelimit";
import { createLogger, transports, format } from "winston";
import { session } from "telegraf-session-mongodb";
import { BotContext } from "../telegrafContext";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});




const GROUP_CHAT_ID = process.env.FOREX_GROUP_CHAT_ID
// MongoDB connection function
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  console.log("Connecting to MongoDB...");
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, {
        retryWrites: true,
        writeConcern: { w: "majority" },
        connectTimeoutMS: 15000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        maxPoolSize: 10,
      });
      console.log("✅ MongoDB connected successfully");
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

// Initialize MongoDB connection
connectDB().catch((error) => {
  console.error("[Startup] Failed to initialize MongoDB:", error);
});

export default function (bot: Telegraf<BotContext>) {
  // Session setup
  if (mongoose.connection.readyState === 1) {
    const db = mongoose.connection.db;
    if (!db) {
      console.error(
        "❌ Mongoose connected but db is undefined. Forex session middleware skipped"
      );
    } else {
      bot.use(
        session(db, {
          sessionName: "session",
          collectionName: "forex_sessions",
        })
      );
      console.log("✅ Forex Bot MongoDB session middleware enabled");
    }
  } else {
    console.error(
      "❌ Mongoose not connected. Forex session middleware skipped"
    );
  }

  bot.use(async (ctx, next) => {
    if (!ctx.session) {
      ctx.session = {
        step: "welcome",
        botType: ctx.botType || "forex",
        retryCount: 0,
      };
    }
    return next();
  });

  const logger = createLogger({
    level: "warn",
    transports: [
      new transports.Console({
        format: format.combine(format.timestamp(), format.simple()),
      }),
    ],
  });

  const getLinkLimiter = rateLimit({
    window: 60_000,
    limit: 3,
    onLimitExceeded: (ctx) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  const userSession: Record<string, any> = {};

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
      const session = userSession[user.telegramId] || {
        botType: "forex",
        retryCount: 0,
        step: "login_id",
      };
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
      session.step = "login_id";
      session.retryCount = (session.retryCount || 0) + 1;
      userSession[user.telegramId] = session;

      const reasonMessage =
        user.rejectionReason === "no_affiliate_link"
          ? "Your Exco Trader account was not registered using our affiliate link."
          : user.rejectionReason === "insufficient_deposit"
          ? "Your Exco Trader account does not have a minimum deposit of $100."
          : "No specific reason provided.";

      const nextSteps =
        user.rejectionReason === "no_affiliate_link"
          ? `To gain access to Afibie FX signals, register a new Exco Trader account using our affiliate  link:\n\n` +
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
    }
  }

  // Watch for status changes in MongoDB
  async function watchUserStatusChanges() {
    try {
      await connectDB();
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
    const userId = ctx.from?.id.toString();
    if (!userId) {
      logger.error("[start] No user ID found");
      return;
    }

    userSession[userId] = { step: "welcome", botType: "forex", retryCount: 0 };

    await ctx.replyWithHTML(
      `<b>🛠 Welcome to <u>Afibie FX Signal</u>! 🚀</b>\n\n` +
        `📈 Afibie FX is an exclusive trading community where members gain access to high-quality trading signals, market insights, and expert strategies to maximize their profits.\n\n` +
        `<b>To gain access to Afibie FX Signals, please complete these steps:</b>\n\n` +
        `✅ <b>Step 1:</b> Solve the Captcha 🔢\n` +
        `✅ <b>Step 2:</b> Register at Exco Trader, deposit <b>$100</b> or more, and provide your <b>Login ID</b> 💰\n` +
        `✅ <b>Step 3:</b> Create Deriv account (Optional) 📊\n\n` +
        `⏳ <b>Once all steps are completed, you will gain full access to Afibie FX Signals - where strategy meets profitability!</b> 💰📊\n\n` +
        `👉 Click <b>CONTINUE</b> to start:`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 CONTINUE", "continue_to_captcha"),
      ])
    );
  });

  bot.action("continue_to_captcha", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!userId || !session) {
      logger.error(
        `[continue_to_captcha] Invalid userId (${userId}) or session not found`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Session expired or invalid. Please start over with /start.`
      );
      return;
    }

    if (session.step !== "welcome") {
      logger.warn(
        `[continue_to_captcha] Invalid session step (${session.step}) for user ${userId}`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    session.step = "captcha";
    const captcha = generateCaptcha();
    session.captcha = captcha;

    await ctx.replyWithHTML(
      `<b>🔐 Step 1: Captcha Verification</b>\n\n` +
        `To prevent bots, please <i>solve this Captcha</i>:\n\n` +
        `👉 <b>Type this number:</b> <code>${captcha}</code>`
    );
  });

  bot.action("get_invite_link", getLinkLimiter, async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      logger.error("[get_invite_link] No user ID found");
      return;
    }

    try {
      await connectDB();
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
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!userId || !session) {
      logger.error(
        `[confirm_final] Invalid userId (${userId}) or session not found`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Session expired or invalid. Please start over with /start.`
      );
      return;
    }

    if (session.step !== "final_confirmation") {
      logger.warn(
        `[confirm_final] Invalid session step (${session.step}) for user ${userId}`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    try {
      await saveAndNotify(ctx, session);
      session.step = "final";
    } catch (error: any) {
      logger.error(`[confirm_final] Error for user ${userId}:`, error);
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
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!userId || !session || session.step !== "final_confirmation") {
      logger.error(
        `[cancel_final] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid action. Please start over with /start.`
      );
      return;
    }

    session.step = "welcome";
    session.excoTraderLoginId = undefined;
    session.derivLoginId = undefined;
    session.country = undefined;
    session.captcha = undefined;
    session.retryCount = 0;

    await ctx.replyWithHTML(
      `<b>🛠 Registration Cancelled</b>\n\n` +
        `📌 You have cancelled the registration process.\n\n` +
        `👉 Type <b>/start</b> to begin again.`
    );
    await ctx.editMessageReplyMarkup(undefined);
  });

  bot.on(message("text"), async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      logger.error("[text] No user ID found");
      return;
    }
    const session = userSession[userId];
    const text = ctx.message.text.trim();
    if (!session) {
      logger.error("[text] No session found for user", { userId });
      return;
    }

    switch (session.step) {
      case "captcha": {
        if (verifyCaptcha(text, session.captcha)) {
          session.step = "captcha_confirmed";
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
          session.captcha = newCaptcha;
          await ctx.replyWithHTML(
            `❌ <b>Incorrect Captcha</b>\n\n` +
              `🚫 Please try again:\n` +
              `👉 Type this number: <code>${newCaptcha}</code>`
          );
        }
        break;
      }

      case "country": {
        session.country = text;
        session.step = "waiting_for_done";
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
        session.excoTraderLoginId = text;
        session.step = "exco_confirmed";
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
        session.derivLoginId = text;
        session.step = "final_confirmation";
        const details = [
          `Exco Trader Login ID: ${
            session.excoTraderLoginId || "Not provided"
          }`,
          session.derivLoginId
            ? `Deriv Login ID: ${session.derivLoginId}`
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
        session.excoTraderLoginId = text;
        session.step = "exco_confirmed";
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
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!session || session.step !== "captcha_confirmed") {
      logger.error(
        `[continue_to_country] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    session.step = "country";
    await ctx.replyWithHTML(
      `<b>🌍 Country Selection</b>\n\n` + `What is your country of residence?`,
      Markup.keyboard([["USA", "Canada", "UK"], ["Rest of the world"]])
        .oneTime()
        .resize()
    );
  });

  bot.action("done_exco", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!session || session.step !== "waiting_for_done") {
      logger.error(
        `[done_exco] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    session.step = "exco_login";
    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Exco Trader Login ID</b>\n\n` +
        `Please enter your <b>Exco Trader Login ID</b> below.\n\n` +
        `💡 <i>You can find it in the welcome email from Exco Trader.</i>\n` +
        `📌 <b>Example:</b> <code>123456456</code>`
    );
  });

  bot.action("continue_to_deriv", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!session || session.step !== "exco_confirmed") {
      logger.error(
        `[continue_to_deriv] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    session.step = "deriv";
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
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!session || session.step !== "deriv") {
      logger.error(
        `[done_deriv] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    session.step = "final_confirmation";
    const details = [
      `Exco Trader Login ID: ${session.excoTraderLoginId || "Not provided"}`,
      session.derivLoginId ? `Deriv Login ID: ${session.derivLoginId}` : null,
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
  });

  bot.action("continue_to_login_id", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id.toString();
    const session = userSession[userId];
    if (!session || session.step !== "login_id") {
      logger.error(
        `[continue_to_login_id] Invalid userId (${userId}) or session step (${session?.step})`
      );
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n` +
          `🚫 Invalid step. Please start over with /start.`
      );
      return;
    }

    await ctx.replyWithHTML(
      `<b>🔹 Submit Your Exco Trader Login ID</b>\n\n` +
        `Please enter your <b>Exco Trader Login ID</b> below.\n\n` +
        `💡 <i>You can find it in the welcome email from Exco Trader.</i>\n` +
        `📌 <b>Example:</b> <code>5677123456</code>`
    );
  });

  async function saveAndNotify(ctx: any, session: any) {
    const telegramId = ctx.from.id.toString();
    try {
      await connectDB();
      if (!session.country) {
        throw new Error("Country is missing in session data");
      }
      if (!session.excoTraderLoginId) {
        throw new Error("Exco Trader Login ID is missing");
      }

      const user = await ForexUserModel.findOneAndUpdate(
        { telegramId, botType: session.botType },
        {
          telegramId,
          username: ctx.from.username || "unknown",
          fullName:
            `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() ||
            "Unknown User",
          botType: "forex",
          country: session.country,
          excoTraderLoginId: session.excoTraderLoginId,
          derivLoginId: session.derivLoginId,
          status: "pending",
        },
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
