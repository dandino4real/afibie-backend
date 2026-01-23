import WebSocket, { WebSocketServer } from "ws";
import { Afibe10XUserModel } from "../models/afibe10x_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";

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

// ✅ Setup Redis (optional: use your existing connection if available)
const redis = new Redis(process.env.REDIS_URL || "");

// --- WebSocket client tracking ---
interface ConnectedClient {
    adminId: string;
    ws: WebSocket;
}

const adminClients: ConnectedClient[] = [];

// ✅ Main setup function
export function setupAfibe10xWebSocket(server: any, afibe10xBot: Telegraf<any>) {
    const wss = new WebSocketServer({ server, path: "/afibe10x-chat" });
    console.log("🌐 WebSocket server for Afibe10x Chat started");

    wss.on("connection", (ws, req) => {
        const params = new URLSearchParams(req.url?.split("?")[1]);
        const adminId = params.get("adminId") || "unknown";

        adminClients.push({ adminId, ws });
        console.log(`✅ Admin connected to Afibe10x Chat: ${adminId}`);

        // --- Handle messages from admin UI ---
        ws.on("message", async (msg) => {
            try {
                const data = JSON.parse(msg.toString());

                switch (data.type) {
                    case "start_chat": {
                        const { telegramId } = data;
                        const sessionKey = `afibe10x:${telegramId}`;
                        const sessionData = await redis.get(sessionKey);

                        if (sessionData) {
                            const session = JSON.parse(sessionData);
                            session.mode = "chat";
                            await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

                            await afibe10xBot.telegram.sendMessage(
                                telegramId,
                                "💬 Admin has joined the chat. You can now send messages directly."
                            );
                        }
                        break;
                    }

                    case "admin_reply": {
                        const { telegramId, message } = data;
                        await afibe10xBot.telegram.sendMessage(
                            telegramId,
                            `👨‍💼 Admin: ${message}`
                        );
                        // 💡 Then send a helpful reminder about /endchat
                        await afibe10xBot.telegram.sendMessage(
                            telegramId,
                            "💬 You can exit this chat anytime by typing /endchat."
                        );

                        // Store message in DB
                        await Afibe10XUserModel.updateOne(
                            { telegramId, botType: "afibe10x" },
                            {
                                $push: {
                                    messages: {
                                        sender: "admin",
                                        user: "Admin",
                                        text: message,
                                        readByAdmin: true, // Explicitly unread
                                        timestamp: new Date(),
                                    },
                                },
                            }
                        );
                        break;
                    }

                    case "end_chat": {
                        const { telegramId } = data;
                        const sessionKey = `afibe10x:${telegramId}`;
                        const sessionData = await redis.get(sessionKey);
                        if (sessionData) {
                            const session = JSON.parse(sessionData);
                            delete session.mode;
                            await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

                            await afibe10xBot.telegram.sendMessage(
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
    globalThis.afibe10xChatHandler = {
        /** 📨 Forward user message from Telegram to admin UI */
        async sendToAdmin(telegramId: string, text: string) {
            const user = await Afibe10XUserModel.findOne({ telegramId, botType: "afibe10x" });
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
            await afibe10xBot.telegram.sendMessage(telegramId, text);
        },
    };
}
