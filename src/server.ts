
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
import afibie10xUserStatsRoutes from "./routes/afibie10x_user_stats";
import { setupForexWebSocket } from "./websocket/forexChatHandler";
import { setupAfibe10xWebSocket } from "./websocket/afibe10xChatHandler";
import http from "http";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { Buffer } from "buffer";

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

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];



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


// App initialization
const initializeApp = async () => {
  try {
    console.log("🚀 Starting application initialization...");
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    await setupBots();
    console.log("✅ Webhooks set successfully");

    const PORT = process.env.PORT || 3000;

    // Create the HTTP server
    const server = http.createServer(app);

    // Create both WebSocket servers with noServer: true
    const forexWss = setupForexWebSocket(server, bots.forexBot_New);
    const afibeWss = setupAfibe10xWebSocket(server, bots.afibe10xBot);

    // Single shared upgrade handler – routes to the correct wss based on path
    server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      console.log('[SHARED UPGRADE] Received upgrade request:', request.url);

      const url = request.url || '';

      if (url.startsWith('/forex-chat')) {
        console.log('[SHARED UPGRADE] Routing to Forex WSS');
        forexWss.handleUpgrade(request, socket, head, (ws) => {
          forexWss.emit('connection', ws, request);
        });
      } else if (url.startsWith('/afibe10x-chat')) {
        console.log('[SHARED UPGRADE] Routing to Afibe10x WSS');
        afibeWss.handleUpgrade(request, socket, head, (ws) => {
          afibeWss.emit('connection', ws, request);
        });
      } else {
        console.log('[SHARED UPGRADE] Unknown path – destroying socket');
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
      }
    });

    // Now add Express middleware and routes (after WebSocket upgrade is handled)
    app.use(helmet());
    app.use(express.json());
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

    // Webhook routes
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
    app.use("/api/users", afibie10xUserStatsRoutes);


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

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
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