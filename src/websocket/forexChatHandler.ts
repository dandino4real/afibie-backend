import WebSocket, { WebSocketServer } from "ws";
import { FOREX_User } from "../models/new-forex_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";

// --- Extend globalThis so TypeScript knows about forexChatHandler ---
declare global {
  // eslint-disable-next-line no-var
  var forexChatHandler: {
    sendToAdmin: (telegramId: string, text: string) => Promise<void>;
    sendToUser: (telegramId: string, text: string) => Promise<void>;
  } | undefined;
}

// ✅ Setup Redis (optional: use your existing connection if available)
const redis = new Redis(process.env.REDIS_URL || "");

// --- WebSocket client tracking ---
interface ConnectedClient {
  adminId: string;
  ws: WebSocket;
}

const adminClients: ConnectedClient[] = [];

// ✅ Main setup function
export function setupForexWebSocket(server: any, forexBot: Telegraf<any>) {
  const wss = new WebSocketServer({ server, path: "/forex-chat" });
  console.log("🌐 WebSocket server for Forex Chat started");

  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url?.split("?")[1]);
    const adminId = params.get("adminId") || "unknown";

    adminClients.push({ adminId, ws });
    console.log(`✅ Admin connected to Forex Chat: ${adminId}`);

    // --- Handle messages from admin UI ---
    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        switch (data.type) {
          case "start_chat": {
            const { telegramId } = data;
            const sessionKey = `forex_new:${telegramId}`;
            const sessionData = await redis.get(sessionKey);

            if (sessionData) {
              const session = JSON.parse(sessionData);
              session.mode = "chat";
              await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

              await forexBot.telegram.sendMessage(
                telegramId,
                "💬 Admin has joined the chat. You can now send messages directly."
              );
            }
            break;
          }

          case "admin_reply": {
            const { telegramId, message } = data;
            await forexBot.telegram.sendMessage(telegramId, `👨‍💼 Admin: ${message}`);

            // Store message in DB
            await FOREX_User.updateOne(
              { telegramId },
              {
                $push: {
                  messages: {
                    from: "admin",
                    user: "Admin",
                    text: message,
                    timestamp: new Date(),
                  },
                },
              }
            );
            break;
          }

          case "end_chat": {
            const { telegramId } = data;
            const sessionKey = `forex_new:${telegramId}`;
            const sessionData = await redis.get(sessionKey);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              delete session.mode;
              await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

              await forexBot.telegram.sendMessage(
                telegramId,
                "✅ Chat session ended. You can continue using the bot normally."
              );
            }
            break;
          }

          default:
            console.warn("⚠️ Unknown WebSocket message type:", data.type);
        }
      } catch (err) {
        console.error("❌ Invalid WS message:", err);
      }
    });

    ws.on("close", () => {
      const idx = adminClients.findIndex((c) => c.ws === ws);
      if (idx !== -1) adminClients.splice(idx, 1);
      console.log(`❌ Admin disconnected: ${adminId}`);
    });
  });

  // --- Global handler accessible from your bot ---
  globalThis.forexChatHandler = {
    /** 📨 Forward user message from Telegram to admin UI */
    async sendToAdmin(telegramId: string, text: string) {
      const user = await FOREX_User.findOne({ telegramId });
      if (!user) return;

      const payload = JSON.stringify({
        type: "user_message",
        telegramId,
        username: user.username,
        name: user.fullName,
        text,
        time: new Date().toISOString(),
      });

      adminClients.forEach(({ ws }) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      });
    },

    /** 📨 Forward admin message to Telegram bot */
    async sendToUser(telegramId: string, text: string) {
      await forexBot.telegram.sendMessage(telegramId, text);
    },
  };
}
