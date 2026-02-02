

import WebSocket, { WebSocketServer } from "ws";
import { FOREX_User } from "../models/new-forex_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";
import { IncomingMessage, Server } from "http";


// --- Extend globalThis so TypeScript knows about forexChatHandler ---
declare global {
  // eslint-disable-next-line no-var
  var forexChatHandler:
    | {
        sendToAdmin: (telegramId: string, text: string) => Promise<void>;
        sendToUser: (telegramId: string, text: string) => Promise<void>;
      }
    | undefined;
}

// ✅ Setup Redis
const redis = new Redis(process.env.REDIS_URL || "");

// --- WebSocket client tracking ---
interface ConnectedClient {
  adminId: string;
  ws: WebSocket;
}

const adminClients: ConnectedClient[] = [];

// ✅ Main setup function - returns the wss instance
export function setupForexWebSocket(server: Server, forexBot: Telegraf<any>): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  console.log("🌐 Forex WebSocket ready (noServer mode)");

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log("🔗 New Forex WebSocket connection attempt:", req.url);

    const params = new URLSearchParams(req.url?.split("?")[1] || "");
    const adminId = params.get("adminId") || "unknown";

    console.log(`✅ Admin connected to Forex Chat: ${adminId}`);
    adminClients.push({ adminId, ws });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: "connection_established",
      adminId,
      timestamp: new Date().toISOString(),
      message: "Forex WebSocket connected"
    }));

    ws.on("message", async (msg) => {
      try {
        console.log("📨 Received Forex WebSocket message:", msg.toString());
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
            }

            await forexBot.telegram.sendMessage(
              telegramId,
              "💬 Admin has joined the chat. You can now send messages directly."
            );

            ws.send(JSON.stringify({
              type: "chat_started",
              telegramId,
              timestamp: new Date().toISOString(),
              message: "Chat session started successfully"
            }));
            break;
          }

          case "admin_reply": {
            const { telegramId, message } = data;
            await forexBot.telegram.sendMessage(
              telegramId,
              `👨‍💼 Admin: ${message}`
            );

            await forexBot.telegram.sendMessage(
              telegramId,
              "💬 You can exit this chat anytime by typing /endchat."
            );

            await FOREX_User.updateOne(
              { telegramId },
              {
                $push: {
                  messages: {
                    sender: "admin",
                    user: "Admin",
                    text: message,
                    readByAdmin: true,
                    timestamp: new Date(),
                  },
                },
              }
            );
            break;
          }

          case "ping": {
            ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
            break;
          }

          default:
            console.warn("⚠️ Unknown Forex WebSocket message type:", data.type);
        }
      } catch (err) {
        console.error("❌ Invalid Forex WS message:", err);
      }
    });

    ws.on("close", () => {
      const idx = adminClients.findIndex((c) => c.ws === ws);
      if (idx !== -1) adminClients.splice(idx, 1);
      console.log(`❌ Forex Admin disconnected: ${adminId}`);
    });

    ws.on("error", (error) => {
      console.error(`❌ Forex WebSocket error for admin ${adminId}:`, error.message);
    });
  });

  // Global handler
  globalThis.forexChatHandler = {
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

    async sendToUser(telegramId: string, text: string) {
      await forexBot.telegram.sendMessage(telegramId, text);
    },
  };

  return wss;  // Return the wss instance
}