import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import {
  Afibe10XUserModel,
  IAfibe10X_User,
} from "../models/afibe10x_user.model";
import { sendAdminAlertAfibe10X } from "../utils/services/notifier-afibe10x";
import { generateCaptcha, verifyCaptcha } from "../utils/captcha";
import rateLimit from "telegraf-ratelimit";
import { BotContext } from "../telegrafContext";
import dotenv from "dotenv";
import Redis from "ioredis";
import { weexService } from "../utils/services/weexService";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const GROUP_CHAT_ID = process.env.AFIBE_10X_GROUP_CHAT_ID;
const CHANNEL_ID = process.env.AFIBE_10X_CHANNEL_ID;
const WEEX_LINK =
  process.env.WEEX_LINK || "https://www.weex.global/en/register?vipCode=afb10x";

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL!);

export default function (bot: Telegraf<BotContext>) {
  // Initialize session properties
  bot.use((ctx, next) => {
    if (!ctx.session) {
      ctx.session = {
        step: "welcome",
        botType: "afibe10x",
        retryCount: 0,
      };
    } else {
      ctx.session.step = ctx.session.step || "welcome";
      ctx.session.botType = "afibe10x";
      ctx.session.retryCount = ctx.session.retryCount || 0;
    }
    return next();
  });

  async function notifyUserOnStatusChange(change: any) {
    const user = change.fullDocument as IAfibe10X_User;
    if (!user || !user.telegramId) return;

    // Get session from Redis
    const sessionKey = `afibe10x:${user.telegramId}`;
    const sessionData = await redis.get(sessionKey);
    let session = sessionData ? JSON.parse(sessionData) : null;

    if (!session) {
      session = {
        botType: "afibe10x",
        retryCount: 0,
        step: "welcome",
      };
    }

    if (user.status === "approved") {
      await bot.telegram.sendMessage(
        user.telegramId,
        `<b>✅ Approved — You’re In.</b>\n\n` +
          `Thanks for waiting.\n` +
          `We confirmed that:\n` +
          `✅ You registered using the recommended link, and\n` +
          `✅ You have the minimum deposit.\n\n` +
          `👇 Click <b>"Get Group Links"</b> to generate your access links to:\n\n` +
          `🔒 <b>10X Signal Channel</b>\n` +
          `🔒 <b>10X Discussion Group</b>\n\n` +
          `⚠️ <i>Note: The links expire in 30 minutes after generation. Join immediately.</i>\n` +
          `If you need help, contact @soame1`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback("🔗 Get Group Links", "get_group_links"),
          ]).reply_markup,
        },
      );
    } else if (user.status === "rejected") {
      // Update session retry count
      session.retryCount = (session.retryCount || 0) + 1;
      session.step = "welcome";
      await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

      if (user.rejectionReason === "no_deposit") {
        await bot.telegram.sendMessage(
          user.telegramId,
          `<b>❌ Not Approved (Deposit Missing)</b>\n\n` +
            `Thanks for waiting.\n` +
            `We confirmed you used the recommended link, but you have <b>not funded the minimum $50.</b>\n\n` +
            `✅ <b>Fund your WEEX account, then click Resubmit.</b>\n\n` +
            `⚠️ <i>Warning: Resubmit only after funding. Repeated unfunded resubmits may lead to a permanent block.</i>`,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback("🔄 Resubmit", "resubmit_uid"),
            ]).reply_markup,
          },
        );
      } else if (user.rejectionReason === "wrong_link") {
        await bot.telegram.sendMessage(
          user.telegramId,
          `<b>❌ Rejected – Wrong Link</b>\n\n` +
            `Thanks for waiting.\n` +
            `Your UID is not in our record meaning - <b>you did not register with the link provided.</b>\n\n` +
            `Register again with the correct link, deposit, then click Done.\n` +
            `👉 <a href="${WEEX_LINK}">Register Here</a>`,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback("✅ Done", "done_weex_retry"),
            ]).reply_markup,
          },
        );
      } else {
        // Generic rejection
        await bot.telegram.sendMessage(
          user.telegramId,
          `<b>❌ Registration Rejected</b>\n\n` +
            `Please check your details and try again.`,
          { parse_mode: "HTML" },
        );
      }
    }
  }

  async function watchUserStatusChanges() {
    try {
      const changeStream = Afibe10XUserModel.watch([], {
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
        error,
      );
    }
  }

  const contactAdminButton = Markup.inlineKeyboard([
    [Markup.button.callback("💬 Contact Admin", "contact_admin")],
  ]);

  const getLinkLimiter = rateLimit({
    window: 60_000,
    limit: 3,
    onLimitExceeded: (ctx: any) =>
      ctx.reply("🚫 Too many link requests! Try again later."),
  });

  bot.start(async (ctx) => {
    // Reset session
    ctx.session = {
      step: "welcome",
      botType: "afibe10x",
      retryCount: 0,
    };
    const sessionKey = `afibe10x:${ctx.from.id}`;

    // Reset session
    ctx.session.mode = "default";

    // Check DB state in case user was in chat
    const tgId = ctx.from.id.toString();
    const user = await Afibe10XUserModel.findOne({
      telegramId: tgId,
      botType: "afibe10x",
    });
    if (user && user.mode === "chat") {
      ctx.session.mode = "chat";
    }

    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b> Welcome to the Afibie 10X Trading Challenge.</b>\n\n` +
        `This is a 4-week guided challenge focused on:\n` +
        `✅ Correct Copy Execution\n` +
        `✅ Risk Management\n` +
        `✅ Weekly Compounding\n\n` +
        `<i>Facilitated by <b>Jude Umeano</b>.</i>\n\n` +
        `<b>Click “Continue” 👇 to proceed.</b>`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 Continue", "continue_introduction"),
      ]),
    );
  });

  bot.action("continue_introduction", async (ctx) => {
    ctx.session.step = "introduction";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Here’s how it works:</b>\n\n` +
        `.  <b>Me + my vetted Pro traders</b> provide the signals\n` +
        `.  You focus on copying correctly, sizing properly, and compounding weekly\n` +
        `.  I’ll teach the execution + risk rules at the start of the challenge\n\n` +
        `🎯 <b>Challenge Goal:</b> Aim for 10X growth through discipline, not gambling.\n` +
        `<i>(This is a challenge, not a guarantee. Results depend on execution and risk control.)</i>\n\n` +
        `This bot will guide you to unlock access to:\n` +
        `🔒 <b>10X Signal Channel</b>\n` +
        `🔒 <b>10X Discussion Group</b>\n\n` +
        `<i>If you have any issues during the process, message support 👉 @soame1</i>\n\n` +
        `👉 <b>Click “Continue” to proceed.</b>`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 Continue", "continue_eligibility"),
      ]),
    );
  });

  bot.action("continue_eligibility", async (ctx) => {
    ctx.session.step = "eligibility";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Eligibility Gate</b>\n\n` +
        `<b>⚠️ Important:</b> This challenge is only for traders who have a minimum trading capital of <b>$50</b>.\n\n` +
        `If you do not have at least <b>$50</b> to trade with, please do not proceed.\n\n` +
        `✅ <b>If you can fund $50 or more, click Continue.</b>`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 Continue", "steps_overview"),
      ]),
    );
  });
  bot.action("steps_overview", async (ctx) => {
    ctx.session.step = "overview";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Steps Overview</b>\n\n` +
        `<b>Steps to Unlock Access 👇</b>.\n` +
        ` ✅ Step 1: Captcha Verification\n` +
        ` ✅ Step 2: Create / Confirm your WEEX account\n` +
        ` ✅ Step 3: Fund your WEEX account (Min. $50)\n` +
        ` ✅ Step 4: Submit your WEEX UID\n` +
        ` ✅ Step 5: Verification + Group Links\n`,
      Markup.inlineKeyboard([
        Markup.button.callback("🔵 Continue", "continue_captcha"),
      ]),
    );
  });

  bot.action("continue_captcha", async (ctx) => {
    ctx.session.step = "captcha";
    ctx.session.captcha = generateCaptcha();
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Step 1: Captcha Verification</b>\n\n` +
        `To prevent bots, please solve this Captcha to continue.\n` +
        `Type this number 👉 <code>${ctx.session.captcha}</code>`,
    );
  });

  // ---------------- ENDCHAT COMMAND ----------------
  bot.command("endchat", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    // Fetch the user's record
    const user = await Afibe10XUserModel.findOne({
      telegramId,
      botType: "afibe10x",
    });
    if (!user) {
      await ctx.reply("⚠️ You don’t have an active chat session.");
      return;
    }

    // Check if user is already not in chat mode
    if (ctx.session.mode !== "chat") {
      await ctx.reply("ℹ️ You’re not currently in chat mode.");
      return;
    }

    // Update session and DB
    ctx.session.mode = "default";
    const sessionKey = `afibe10x:${telegramId}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await Afibe10XUserModel.updateOne(
      { telegramId, botType: "afibe10x" },
      { $set: { mode: "default" } },
    );

    // Notify user
    await ctx.replyWithHTML(
      `✅ <b>Chat mode exited</b>\n\nYou’re now back in the normal bot flow.\n\nIf you need to contact support again, click below.`,
      contactAdminButton,
    );
  });

  bot.on("text", async (ctx) => {
    if (!ctx.session) return;
    const text = ctx.message.text.trim();
    const sessionKey = `afibe10x:${ctx.from.id}`;

    const action = text.toLowerCase();
    // Check if user typed 'endchat' instead of '/endchat'
    if (ctx.session.mode === "chat" && /^end\s*chat$/.test(action)) {
      await ctx.reply(
        "⚠️ Did you mean /endchat ? Type /endchat to exit chat mode.",
      );
      return;
    }

    // ✅ If user is in chat mode
    if (ctx.session.mode === "chat") {
      const telegramId = ctx.from?.id?.toString();
      // Save message to DB (append)
      await Afibe10XUserModel.updateOne(
        { telegramId, botType: "afibe10x" },
        {
          $push: {
            messages: {
              sender: "user",
              user: "User",
              text,
              readByAdmin: false,
              timestamp: new Date(),
            },
          },
        },
      );

      // Send to admin via WebSocket
      globalThis.afibe10xChatHandler?.sendToAdmin(telegramId!, text);

      await ctx.reply("📩 Message sent to admin.");
      return;
    }

    switch (ctx.session.step) {
      case "captcha": {
        if (verifyCaptcha(text, ctx.session.captcha || "")) {
          ctx.session.step = "weex_registration";
          await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

          await ctx.replyWithHTML(
            `<b>Step 2 — WEEX Registration</b>\n\n` +
              `<b>Why WEEX?</b>\n` +
              `🌍 Global access\n` +
              `⚡ Fast setup\n` +
              `🔓 No KYC required\n\n` +
              `📌 <b>Register here</b> 👉 <a href="${WEEX_LINK}">WEEX Registration Link</a>\n\n` +
              `After registration, click <b>“Done”</b> ✅\n\n` +
              `<i>Note: If you already have a WEEX account created using our recommended link from the past, you don’t need to create a new one — just click Done.</i>`,
            Markup.inlineKeyboard([
              Markup.button.callback("✅ Done", "done_weex"),
            ]),
          );
        } else {
          const newCaptcha = generateCaptcha();
          ctx.session.captcha = newCaptcha;
          await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
          await ctx.replyWithHTML(
            `❌ <b>Failed.</b> Please try again.\nType this number 👉 <code>${newCaptcha}</code>`,
          );
        }
        break;
      }
      case "submit_uid": {
        if (!/^\d{5,15}$/.test(text)) {
          await ctx.replyWithHTML(
            `❌ <b>Invalid UID</b>\n\n` +
              `Please enter a valid numeric WEEX UID.`,
          );
          return;
        }
        ctx.session.weexUid = text;
        await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

        await saveUser(ctx);
        break;
      }
    }
  });

  bot.action("done_weex", async (ctx) => {
    ctx.session.step = "capital_check";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Step 3 — Minimum Trading Capital</b>\n\n` +
        `💳 <b>Fund Your Account (Minimum $50)</b>\n\n` +
        `Fund your WEEX account with a minimum trading balance of <b>$50</b>.\n\n` +
        `<i><b>Note</b>: If your WEEX account already has <b>$50 or more</b>, you don’t need to fund again.</i>\n\n` +
        `When you’re ready, click <b>Done</b> ✅`,
      Markup.inlineKeyboard([
        Markup.button.callback("✅ Done", "done_capital"),
      ]),
    );
  });

  bot.action("done_weex_retry", async (ctx) => {
    // Logic for when user retries after "Wrong Link" rejection
    // Redirect to submit UID again
    ctx.session.step = "submit_uid";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
    await ctx.replyWithHTML(
      `<b>Step 4 — Submit WEEX UID</b>\n\n` +
        `🧾 <b>Submit Your WEEX UID</b>\n` +
        `Please enter your WEEX UID below:`,
    );
  });

  bot.action("done_capital", async (ctx) => {
    ctx.session.step = "submit_uid";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    const uidGifFileId = process.env.AFIBE_10X_UID_GIF_FILE_ID;

    // Message text for both scenarios
    const messageText =
      `<b>Step 4 — Submit WEEX UID</b>\n\n` +
      `🧾 <b>Submit Your WEEX UID</b>\n` +
      `Please enter your WEEX UID below:`;

    // Check if ID is valid and not a placeholder
    if (uidGifFileId && uidGifFileId !== "placeholder_file_id") {
      try {
        await ctx.replyWithAnimation(uidGifFileId, {
          caption: messageText,
          parse_mode: "HTML",
        });
        return; // Exit if animation sent successfully
      } catch (error) {
        console.error("Failed to send animation, falling back to text:", error);
        // Fallback to text below
      }
    }

    // Fallback or default text reply
    await ctx.replyWithHTML(messageText);
  });

  bot.action("resubmit_uid", async (ctx) => {
    ctx.session.step = "submit_uid";
    const sessionKey = `afibe10x:${ctx.from.id}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);

    await ctx.replyWithHTML(
      `<b>Step 4 — Submit WEEX UID</b>\n\n` +
        `🧾 <b>Submit Your WEEX UID</b>\n` +
        `Please enter your WEEX UID below:`,
    );
  });

  async function saveUser(ctx: any) {
    try {
      const telegramId = ctx.from.id.toString();

      const updatePayload: Partial<IAfibe10X_User> = {
        telegramId,
        username: ctx.from.username || "unknown",
        fullName:
          `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() ||
          "Unknown User",
        botType: "afibe10x",
        userId: ctx.session.weexUid,
        status: "pending",
      };

      // 🔐 External API must be protected
      let verificationResult: boolean | null = null;
      try {
        verificationResult = await weexService.verifyUid(ctx.session.weexUid);
      } catch (e) {
        console.error("WEEX verification failed:", e);
      }

      if (verificationResult === true) {
        Object.assign(updatePayload, {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: { name: "System (Weex API)", email: "system@bot" },
        });
      }

      if (verificationResult === false) {
        Object.assign(updatePayload, {
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: "wrong_link",
          rejectedBy: { name: "System (Weex API)", email: "system@bot" },
        });
      }

      const user = await Afibe10XUserModel.findOneAndUpdate(
        { telegramId, botType: "afibe10x" },
        { $set: updatePayload }, // ✅ CRITICAL FIX
        { upsert: true, new: true },
      );

      if (user.status === "pending") {
        await ctx.replyWithHTML(
          `<b>Verification</b>\n\n⏳ We are verifying your account…`,
          contactAdminButton,
        );
      }

      await sendAdminAlertAfibe10X(user);
    } catch (error) {
      console.error("[saveUser] HARD FAILURE:", error);
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n🚫 Could not save your details. Please try again`,
      );
    }
  }

  bot.action("get_group_links", getLinkLimiter, async (ctx) => {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) return;

    const user = await Afibe10XUserModel.findOne({
      telegramId: tgId,
      botType: "afibe10x",
    });

    if (!user) {
      await ctx.answerCbQuery("❌ User not found.", { show_alert: true });
      return;
    }

    // 🚫 HARD STOP
    if (user.groupLinksGenerated) {
      await ctx.answerCbQuery("❌ Links already generated.", {
        show_alert: true,
      });
      return;
    }

    if (user.status !== "approved") {
      await ctx.replyWithHTML(
        `<b>⚠️ Access Denied</b>\n\n` + `⛔ <i>You are not yet approved.</i>`,
      );
      return;
    }

    // 🔒 Lock it immediately (transaction-safe)
    user.groupLinksGenerated = true;
    user.groupLinksGeneratedAt = new Date();
    await user.save();

    try {
      // Generate links for Channel and Group
      let channelLink = "";
      let groupLink = "";

      if (CHANNEL_ID) {
        const link = await bot.telegram.createChatInviteLink(CHANNEL_ID, {
          expire_date: Math.floor(Date.now() / 1000) + 1800,
          member_limit: 1,
        });
        channelLink = link.invite_link;
      }

      if (GROUP_CHAT_ID) {
        const link = await bot.telegram.createChatInviteLink(GROUP_CHAT_ID, {
          expire_date: Math.floor(Date.now() / 1000) + 1800,
          member_limit: 1,
        });
        groupLink = link.invite_link;
      }

      await ctx.replyWithHTML(
        `<b>🎉 Here are your access links:</b>\n\n` +
          `🔒 <b>10X Signal Channel:</b> <a href="${channelLink}">${channelLink}</a>\n\n` +
          `🔒 <b>10X Discussion Group:</b> <a href="${groupLink}">${groupLink}</a>\n\n` +
          `⚠️ <i>These links expire in 30 minutes!</i>`,
      );
    } catch (error) {
      console.error("[get_group_links] Error:", error);
      await ctx.replyWithHTML(
        `<b>⚠️ Error</b>\n\n🚫 Failed to generate links.`,
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
        `To exit chat mode, type <b>/endchat</b> anytime.`,
    );

    // Update DB
    const telegramId = ctx.from?.id?.toString();
    await Afibe10XUserModel.updateOne(
      { telegramId, botType: "afibe10x" },
      { $set: { mode: "chat" } },
    );
    const sessionKey = `afibe10x:${telegramId}`;
    await redis.set(sessionKey, JSON.stringify(ctx.session), "EX", 86400);
  });

  // Watch for status changes
  watchUserStatusChanges();

  bot.catch((err, ctx) => {
    console.error(
      `🚨 Afibe 10X Bot Error for update ${ctx.update.update_id}:`,
      err,
    );
    ctx.reply("❌ An error occurred. Please try again later.");
  });

  // getting the gif file id from

  //    bot.on("animation", async (ctx) => {
  //   const fileId = ctx.message.animation.file_id;

  //   console.log("🎞️ GIF (animation) File ID:", fileId);

  //   await ctx.replyWithHTML(
  //     `✅ Got it!\nGIF File ID:\n<code>${fileId}</code>`
  //   );
  // });
}
