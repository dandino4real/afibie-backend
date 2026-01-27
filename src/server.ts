

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { Telegraf, session } from "telegraf";
import Redis from "ioredis";
import { connectDB } from "./config/db";
import { BotContext } from "./telegrafContext";
import cryptoBotHandler from "./bots/cryptoBot";
import newforexBotHandler from "./bots/forexBot";
import afibe10xBotHandler from "./bots/afibe10xBot";
import cryptoUserRoutes from "./routes/crypto_user.routes";
import forexUserRoutes from "./routes/forex_user.routes";
import forexNewUserRoutes from "./routes/forex_new_user.routes";
import afibe10xUserRoutes from "./routes/afibe10x_user.routes";
import staticticsRoutes from "./routes/users_stats.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import { setupForexWebSocket } from "./websocket/forexChatHandler";
import { setupAfibe10xWebSocket } from "./websocket/afibe10xChatHandler";
import http from "http";
import { Socket } from 'net';

dotenv.config();

const app = express();

// Validate environment variables
const requiredEnvVars = [
  "BOT_TOKEN_CRYPTO",
  "NEW_BOT_TOKEN_FOREX",
  "BOT_TOKEN_AFIBIE_10X",
  "MONGODB_URI",
  "WEBHOOK_SECRET",
  "BASE_URL",
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars);
  process.exit(1);
}

// Debug environment variables
console.log("Environment variables loaded:");
console.log("CORS_ORIGINS:", process.env.CORS_ORIGINS || "Not set");
console.log("BOT_TOKEN_CRYPTO:", process.env.BOT_TOKEN_CRYPTO ? "exists" : "MISSING");
console.log("NEW_BOT_TOKEN_FOREX:", process.env.NEW_BOT_TOKEN_FOREX ? "exists" : "MISSING");
console.log("BOT_TOKEN_AFIBIE_10X:", process.env.BOT_TOKEN_AFIBIE_10X ? "exists" : "MISSING");
console.log("BASE_URL:", process.env.BASE_URL || "Not set");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "exists" : "MISSING");
console.log("WEBHOOK_SECRET:", process.env.WEBHOOK_SECRET ? "exists" : "MISSING");
console.log("REDIS_URL:", process.env.REDIS_URL ? "exists" : "Not set");

// Middleware setup
app.use(helmet());
app.use(express.json());

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];
app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"],
  })
);

app.use((req, _, next) => {
  console.log(`➡️  ${req.method} ${req.path}`);
  next();
});

// Bot initialization
const bots = {
  cryptoBot: new Telegraf<BotContext>(process.env.BOT_TOKEN_CRYPTO!),
  forexBot_New: new Telegraf<BotContext>(process.env.NEW_BOT_TOKEN_FOREX!),
  afibe10xBot: new Telegraf<BotContext>(process.env.BOT_TOKEN_AFIBIE_10X!),
};

bots.cryptoBot.context.botType = "crypto";
bots.forexBot_New.context.botType = "forex_new";
bots.afibe10xBot.context.botType = "afibe10x";

// Session middleware
let redis: Redis | null = null;
let sessionMiddleware;
if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
  console.log("🔗 Attempting to use Redis session store (production)");
  try {
    redis = new Redis(process.env.REDIS_URL);
    redis.on("connect", () => console.log("✅ Redis connected"));
    redis.on("error", (err) => console.error("❌ Redis error:", err));

    const redisAdapter = (client: Redis) => ({
      get: async (key: string) => {
        const data = await client.get(key);
        return data ? JSON.parse(data) : undefined;
      },
      set: async (key: string, value: any) => {
        await client.set(key, JSON.stringify(value), "EX", 60 * 60 * 24 * 3);
      },
      delete: async (key: string) => {
        await client.del(key);
      },
    });

    sessionMiddleware = session({
      store: redisAdapter(redis),
      defaultSession: () => ({}),
      getSessionKey: (ctx: BotContext) =>
        ctx.from ? `${ctx.botType}:${ctx.from.id}` : undefined,
    });
  } catch (error) {
    console.error("❌ Failed to initialize Redis, falling back to in-memory session:", error);
    sessionMiddleware = session({ defaultSession: () => ({}) });
  }
} else {
  console.log("⚙️ Using in-memory session (local development or Redis unavailable)");
  sessionMiddleware = session({ defaultSession: () => ({}) });
}

Object.values(bots).forEach((bot) => bot.use(sessionMiddleware));

// Attach handlers
cryptoBotHandler(bots.cryptoBot);
newforexBotHandler(bots.forexBot_New);
afibe10xBotHandler(bots.afibe10xBot);

// Webhook setup
const setupBots = async () => {
  const baseUrl = process.env.BASE_URL!;
  const webhookSecret = process.env.WEBHOOK_SECRET!;
  console.log(`Setting webhooks for base URL: ${baseUrl}`);

  try {
    for (const [botName, botInstance] of Object.entries(bots)) {
      const webhookPath = `/webhook/${botName}`;
      const webhookUrl = `${baseUrl}${webhookPath}`;
      console.log(`📡 Setting webhook for ${botName}: ${webhookUrl}`);
      await botInstance.telegram.setWebhook(webhookUrl, { secret_token: webhookSecret });
      console.log(`✅ Webhook set for ${botName}`);
    }
    return true;
  } catch (error) {
    console.error("❌ Webhook setup error:", error);
    throw error;
  }
};

// Webhook handler
const createWebhookHandler = (bot: Telegraf<BotContext>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`Received ${req.method} request at ${req.path}`);
    const receivedToken = req.headers["x-telegram-bot-api-secret-token"];
    if (receivedToken !== process.env.WEBHOOK_SECRET) {
      console.warn(
        `Unauthorized webhook access attempt to ${req.path}. Received: ${receivedToken}, Expected: ${process.env.WEBHOOK_SECRET}`
      );
      res.status(401).send("Unauthorized");
      return;
    }
    try {
      bot.handleUpdate(req.body, res);
    } catch (error) {
      console.error(`Webhook error for ${req.path}:`, error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  };
};

// Apply webhook handlers
app.post("/webhook/cryptoBot", express.json(), createWebhookHandler(bots.cryptoBot));
app.post("/webhook/forexBot_New", express.json(), createWebhookHandler(bots.forexBot_New));
app.post("/webhook/afibe10xBot", express.json(), createWebhookHandler(bots.afibe10xBot));

// API routes
app.use("/api/users", cryptoUserRoutes);
app.use("/api/users", forexUserRoutes);
app.use("/api/new-forex-users", forexNewUserRoutes);
app.use("/api/users", afibe10xUserRoutes);
app.use("/api/users", staticticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    environment: process.env.NODE_ENV,
    sessionType: process.env.NODE_ENV === "production" ? "redis" : "memory",
    bots: {
      crypto: !!process.env.BOT_TOKEN_CRYPTO,
      forex_new: !!process.env.NEW_BOT_TOKEN_FOREX,
      afibe10x: !!process.env.BOT_TOKEN_AFIBIE_10X,
    },
  });
});

// App initialization
const initializeApp = async () => {
  try {
    console.log("🚀 Starting application initialization...");
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    await setupBots();
    console.log("✅ Webhooks set successfully");

    const PORT = process.env.PORT || 3000;

    //     // 👇 CREATE the server explicitly
    // const server = http.createServer(app);

    // // 👇 Attach WebSockets BEFORE listen (important)
    // setupForexWebSocket(server, bots.forexBot_New);
    // setupAfibe10xWebSocket(server, bots.afibe10xBot);


    //  // 👇 NOW start listening
    // server.listen(PORT, () => {
    //   console.log(`🚀 Server running on port ${PORT}`);
    // });


    const server = app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );

    // 🧩 Initialize WebSocket for Forex chat
    // 🧩 Initialize WebSocket for Afibe10x chat
    setupForexWebSocket(server, bots.forexBot_New);
    setupAfibe10xWebSocket(server, bots.afibe10xBot);
  } catch (error) {
    console.error("❌ App initialization error:", error);
    process.exit(1);
  }
};

initializeApp();

// Graceful shutdown
const shutdown = async () => {
  console.log("🧹 Shutting down gracefully...");
  try {
    for (const bot of Object.values(bots)) {
      await bot.stop();
    }
    if (process.env.NODE_ENV === "production") {
      const redis = new Redis(process.env.REDIS_URL!);
      await redis.quit();
    }
    console.log("✅ All bots and Redis stopped successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
