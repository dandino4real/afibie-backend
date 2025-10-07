


// import express, { Request, Response } from "express";
// import cors from "cors";
// import helmet from "helmet";
// import dotenv from "dotenv";
// import { Telegraf, session } from "telegraf";
// import Redis from "ioredis";
// import { connectDB } from "./config/db";
// import { BotContext } from "./telegrafContext";

// // Routes
// import cryptoUserRoutes from "./routes/crypto_user.routes";
// import forexUserRoutes from "./routes/forex_user.routes";
// import forexNewUserRoutes from "./routes/forex_new_user.routes";
// import staticticsRoutes from "./routes/users_stats.routes";
// import authRoutes from "./routes/auth.routes";
// import adminRoutes from "./routes/admin.routes";

// // Bot handlers
// import cryptoBotHandler from "./bots/cryptoBot";
// // import forexBotHandler from "./bots/forexBot";
// import newforexBotHandler from "./bots/newForexBot";

// // Load environment variables
// dotenv.config();

// const app = express();

// // =====================================================
// // Middleware setup
// // =====================================================
// app.use(helmet());
// app.use(express.json());

// const corsOrigins = process.env.CORS_ORIGINS
//   ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
//   : ["http://localhost:4000"];

// app.use(
//   cors({
//     origin: corsOrigins,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"],
//   })
// );

// // Debug log
// app.use((req, _, next) => {
//   console.log(`➡️  ${req.method} ${req.path}`);
//   next();
// });



//     // API routes
//     app.use("/api/crypto-users", cryptoUserRoutes);
//     app.use("/api/forex-users", forexUserRoutes);
//     app.use("/api/new-forex-users", forexNewUserRoutes);
//     app.use("/api/statistics", staticticsRoutes);
//     app.use("/api/auth", authRoutes);
//     app.use("/api/admins", adminRoutes);

//     // Health check
//     app.get("/health", (req: Request, res: Response) => {
//       res.status(200).json({
//         status: "OK",
//         environment: process.env.NODE_ENV,
//         sessionType: process.env.NODE_ENV === "production" ? "redis" : "memory",
//       });
//     });

// // =====================================================
// // BOT INITIALIZATION
// // =====================================================

// const bots = {
//   cryptoBot: new Telegraf<BotContext>(process.env.BOT_TOKEN_CRYPTO!),
//   // forexBot: new Telegraf<BotContext>(process.env.BOT_TOKEN_FOREX!),
//   forexBot_New: new Telegraf<BotContext>(process.env.NEW_BOT_TOKEN_FOREX!),
// };

// // Assign botType to each bot context
// bots.cryptoBot.context.botType = "crypto";
// // bots.forexBot.context.botType = "forex";
// bots.forexBot_New.context.botType = "forex_new";

// // =====================================================
// // DYNAMIC SESSION HANDLER
// // =====================================================
// const redisAdapter = (client: Redis) => ({
//   get: async (key: string) => {
//     const data = await client.get(key);
//     return data ? JSON.parse(data) : undefined;
//   },
//   set: async (key: string, value: any) => {
//     await client.set(key, JSON.stringify(value), "EX", 60 * 60 * 24 * 3); // 3 days TTL
//   },
//   delete: async (key: string) => {
//     await client.del(key);
//   },
// });

// let sessionMiddleware;

// if (process.env.NODE_ENV === "production") {
//   console.log("🔗 Using Redis session store (Hostinger Production)");

//   const redis = new Redis(process.env.REDIS_URL!, {
//     tls: process.env.BASE_URL?.startsWith("https") ? {} : undefined,
//   });

//   sessionMiddleware = session({
//     store: redisAdapter(redis),
//     defaultSession: () => ({}),
//     getSessionKey: (ctx: BotContext) =>
//       ctx.from ? `${ctx.botType}:${ctx.from.id}` : undefined,
//   });
// } else {
//   console.log("⚙️ Using in-memory session (local development)");
//   sessionMiddleware = session({ defaultSession: () => ({}) });
// }

// // Apply session middleware to all bots
// Object.values(bots).forEach((bot) => bot.use(sessionMiddleware));

// // =====================================================
// // ATTACH BOT HANDLERS
// // =====================================================
// cryptoBotHandler(bots.cryptoBot);
// // forexBotHandler(bots.forexBot);
// newforexBotHandler(bots.forexBot_New);

// // =====================================================
// // APP INITIALIZATION
// // =====================================================
// const initializeApp = async () => {
//   try {
//     await connectDB();
//     console.log("✅ MongoDB connected");

//     const isProd = process.env.NODE_ENV === "production";
//     const baseUrl = process.env.BASE_URL!;
//     const webhookSecret = process.env.WEBHOOK_SECRET!;


//     // Configure bots based on environment
//    for (const [botName, botInstance] of Object.entries(bots)) {
//   try {
//     const webhookPath = `/webhook/${botName}`;
//     const webhookUrl = `${baseUrl}${webhookPath}`;

//     if (isProd) {
//       console.log(`📡 Setting webhook for ${botName}: ${webhookUrl}`);

//       await botInstance.telegram.setWebhook(webhookUrl, {
//         secret_token: webhookSecret,
//       });

//       app.use(
//         webhookPath,
//         botInstance.webhookCallback(webhookPath, { secretToken: webhookSecret })
//       );
//     } else {
//       console.log(`🚀 Launching bot: ${botName}`);
//       await botInstance.launch();
//       console.log(`🤖 ${botName} launched in polling mode`);
//     }
//   } catch (err) {
//     console.error(`❌ Failed to launch ${botName}:`, err);
//   }
// }




//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
//   } catch (error) {
//     console.error("❌ App initialization error:", error);
//     process.exit(1);
//   }
// };

// initializeApp();

// // =====================================================
// // GRACEFUL SHUTDOWN
// // =====================================================
// const shutdown = async () => {
//   console.log("🧹 Shutting down gracefully...");
//   try {
//     for (const bot of Object.values(bots)) {
//       await bot.stop();
//     }
//     console.log("✅ All bots stopped successfully");
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Error during shutdown:", err);
//     process.exit(1);
//   }
// };

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);

// export default app;





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
import cryptoUserRoutes from "./routes/crypto_user.routes";
import forexUserRoutes from "./routes/forex_user.routes";
import forexNewUserRoutes from "./routes/forex_new_user.routes";
import staticticsRoutes from "./routes/users_stats.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();

// Validate environment variables
const requiredEnvVars = [
  "BOT_TOKEN_CRYPTO",
  "NEW_BOT_TOKEN_FOREX",
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
};

bots.cryptoBot.context.botType = "crypto";
bots.forexBot_New.context.botType = "forex_new";

// Session middleware
// let sessionMiddleware;
// if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
//   console.log("🔗 Using Redis session store (production)");
//   const redis = new Redis(process.env.REDIS_URL, {
//     tls: process.env.BASE_URL?.startsWith("https") ? {} : undefined,
//   });
//   redis.on("connect", () => console.log("✅ Redis connected"));
//   redis.on("error", (err) => console.error("❌ Redis error:", err));

//   const redisAdapter = (client: Redis) => ({
//     get: async (key: string) => {
//       const data = await client.get(key);
//       return data ? JSON.parse(data) : undefined;
//     },
//     set: async (key: string, value: any) => {
//       await client.set(key, JSON.stringify(value), "EX", 60 * 60 * 24 * 3);
//     },
//     delete: async (key: string) => {
//       await client.del(key);
//     },
//   });

//   sessionMiddleware = session({
//     store: redisAdapter(redis),
//     defaultSession: () => ({}),
//     getSessionKey: (ctx: BotContext) => (ctx.from ? `${ctx.botType}:${ctx.from.id}` : undefined),
//   });
// } else {
//   console.log("⚙️ Using in-memory session (local development)");
//   sessionMiddleware = session({ defaultSession: () => ({}) });
// }

// Object.values(bots).forEach((bot) => bot.use(sessionMiddleware));

// Session middleware
// Session middleware
let redis: Redis | null = null;
let sessionMiddleware;
if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
  console.log("🔗 Attempting to use Redis session store (production)");
  try {
    redis = new Redis(process.env.REDIS_URL); // Remove tls option for localhost
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
      getSessionKey: (ctx: BotContext) => (ctx.from ? `${ctx.botType}:${ctx.from.id}` : undefined),
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

// API routes
app.use("/api/users", cryptoUserRoutes);
app.use("/api/users", forexUserRoutes);
app.use("/api/new-forex-users", forexNewUserRoutes);
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
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
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