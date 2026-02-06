import WebSocket, { WebSocketServer } from "ws";
import { Afibe10XUserModel } from "../models/afibe10x_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";
import { IncomingMessage, Server } from "http";

// --- Extend globalThis so TypeScript knows about afibe10xChatHandler ---
declare global {
  // eslint-disable-next-line no-var
  var afibe10xChatHandler:
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
export function setupAfibe10xWebSocket(
  server: Server,
  afibe10xBot: Telegraf<any>,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const params = new URLSearchParams(req.url?.split("?")[1] || "");
    const adminId = params.get("adminId") || "unknown";

    adminClients.push({ adminId, ws });

    ws.send(
      JSON.stringify({
        type: "connection_established",
        adminId,
        timestamp: new Date().toISOString(),
        message: "Afibe10x WebSocket connected",
      }),
    );

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        switch (data.type) {
          case "start_chat": {
            const { telegramId } = data;

            await Afibe10XUserModel.updateOne(
              { telegramId, botType: "afibe10x" },
              {
                $set: {
                  "messages.$[msg].readByAdmin": true,
                  unreadCount: 0,
                  hasUnread: false,
                },
              },
              {
                arrayFilters: [
                  { "msg.sender": "user", "msg.readByAdmin": false },
                ],
              },
            );

            const sessionKey = `afibe10x:${telegramId}`;
            const sessionData = await redis.get(sessionKey);

            if (sessionData) {
              const session = JSON.parse(sessionData);
              session.mode = "chat";
              await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
            }

            ws.send(
              JSON.stringify({
                type: "chat_started",
                telegramId,
                timestamp: new Date().toISOString(),
                message: "Chat session started successfully",
              }),
            );
            break;
          }

          case "admin_reply": {
            const { telegramId, message } = data;
            await afibe10xBot.telegram.sendMessage(
              telegramId,
              `👨‍💼 Admin: ${message}`,
            );

            await afibe10xBot.telegram.sendMessage(
              telegramId,
              "💬 You can exit this chat anytime by typing /endchat.",
            );

            // await Afibe10XUserModel.updateOne(
            //   { telegramId, botType: "afibe10x" },
            //   {
            //     $push: {
            //       messages: {
            //         sender: "admin",
            //         user: "Admin",
            //         text: message,
            //         readByAdmin: true,
            //         timestamp: new Date(),
            //       },
            //     },
            //   },
            // );

            await Afibe10XUserModel.updateOne(
              { telegramId, botType: "afibe10x" },
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
                $set: {
                  unreadCount: 0,
                  hasUnread: false,
                  "messages.$[msg].readByAdmin": true,
                },
              },
              {
                arrayFilters: [
                  { "msg.sender": "user", "msg.readByAdmin": false },
                ],
              },
            );

            break;
          }

          case "ping": {
            ws.send(
              JSON.stringify({
                type: "pong",
                timestamp: new Date().toISOString(),
              }),
            );
            break;
          }

          default:
            console.warn(
              "⚠️ Unknown Afibe10x WebSocket message type:",
              data.type,
            );
        }
      } catch (err) {
        console.error("❌ Invalid Afibe10x WS message:", err);
      }
    });

    ws.on("close", () => {
      const idx = adminClients.findIndex((c) => c.ws === ws);
      if (idx !== -1) adminClients.splice(idx, 1);
      console.log(`❌ Afibe10x Admin disconnected: ${adminId}`);
    });

    ws.on("error", (error) => {
      console.error(
        `❌ Afibe10x WebSocket error for admin ${adminId}:`,
        error.message,
      );
    });
  });

  // Global handler
  globalThis.afibe10xChatHandler = {
    async sendToAdmin(telegramId: string, text: string) {
      const user = await Afibe10XUserModel.findOne({
        telegramId,
        botType: "afibe10x",
      });
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
      await afibe10xBot.telegram.sendMessage(telegramId, text);
    },
  };

  return wss;
}
