

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
    const wss = new WebSocketServer({ 
        server, 
        // path: "/afibe10x-chat",
        verifyClient: (info, cb) => {
        const url = info.req.url || '';
        console.log(`[WS VERIFY] Incoming URL: ${url}`);
        console.log(`[WS VERIFY] Full request headers:`, JSON.stringify(info.req.headers, null, 2));
        if (url.startsWith('/afibe10x-chat')) {
            console.log(`[WS VERIFY] ACCEPTED: starts with /afibe10x-chat`);
            cb(true);  // Accept
        } else {
            console.log(`[WS VERIFY] REJECTED: does not start with /afibe10x-chat`);
            cb(false, 404, 'Not Found');  // Or 400, but 404 is clearer
        }
    },

        perMessageDeflate: {
            zlibDeflateOptions: {
                chunkSize: 1024,
                memLevel: 7,
                level: 3,
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024,
            },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            serverMaxWindowBits: 10,
            concurrencyLimit: 10,
            threshold: 1024,
        }
    });
    
    console.log("🌐 WebSocket server for Afibe10x Chat started on /afibe10x-chat");

    wss.on('wsClientError', (err, socket, req) => {
    console.error("[WS CLIENT ERROR] Upgrade handshake failed!");
    console.error("[WS CLIENT ERROR] Error:", err.message);
    console.error("[WS CLIENT ERROR] Request path:", req.url);
    console.error("[WS CLIENT ERROR] Headers:", req.headers);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');  // Explicitly reject
});

    wss.on("connection", (ws, req) => {
        console.log("🔗 New WebSocket connection attempt:", req.url);
        
        const params = new URLSearchParams(req.url?.split("?")[1] || "");
        const adminId = params.get("adminId") || "unknown";



console.log("[WS DEBUG] Connection attempt received by backend");
console.log("[WS DEBUG] Full req.url:", req.url);
console.log("[WS DEBUG] Upgrade header:", req.headers.upgrade);
console.log("[WS DEBUG] Connection header:", req.headers.connection);
console.log("[WS DEBUG] All upgrade-related headers:", 
  JSON.stringify({
    upgrade: req.headers.upgrade,
    connection: req.headers.connection,
    'sec-websocket-version': req.headers['sec-websocket-version'],
    'sec-websocket-key': req.headers['sec-websocket-key'] ? '[present]' : 'missing'
  }, null, 2)
);

        
        console.log(`✅ Admin connected to Afibe10x Chat: ${adminId}`);
        adminClients.push({ adminId, ws });

        // Send connection confirmation
        ws.send(JSON.stringify({ 
            type: "connection_established", 
            adminId,
            timestamp: new Date().toISOString(),
            message: "WebSocket connection established successfully"
        }));

        // --- Handle messages from admin UI ---
        ws.on("message", async (msg) => {
            try {
                console.log("📨 Received WebSocket message:", msg.toString());
                const data = JSON.parse(msg.toString());

                switch (data.type) {
                    case "start_chat": {
                        const { telegramId } = data;
                        console.log(`🚀 Starting chat for telegramId: ${telegramId}`);
                        
                        const sessionKey = `afibe10x:${telegramId}`;
                        const sessionData = await redis.get(sessionKey);

                        if (sessionData) {
                            const session = JSON.parse(sessionData);
                            session.mode = "chat";
                            await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
                            console.log(`✅ Session updated to chat mode for ${telegramId}`);
                        } else {
                            console.log(`⚠️ No session found for ${telegramId}, creating new one`);
                            const session = { mode: "chat", step: "chat", botType: "afibe10x", retryCount: 0 };
                            await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
                        }

                        // Send confirmation back to admin
                        ws.send(JSON.stringify({
                            type: "chat_started",
                            telegramId,
                            timestamp: new Date().toISOString(),
                            message: "Chat session started successfully"
                        }));
                        
                        // Notify user via Telegram
                        try {
                            await afibe10xBot.telegram.sendMessage(
                                telegramId,
                                "💬 Admin has joined the chat. You can now send messages directly."
                            );
                            console.log(`✅ Telegram notification sent to ${telegramId}`);
                        } catch (telegramErr: any) {
                            console.error("❌ Failed to send Telegram notification:", telegramErr.message);
                        }
                        break;
                    }

                    case "admin_reply": {
                        const { telegramId, message } = data;
                        console.log(`📤 Admin reply to ${telegramId}: ${message}`);
                        
                        try {
                            // Send message to user via Telegram
                            await afibe10xBot.telegram.sendMessage(
                                telegramId,
                                `👨‍💼 Admin: ${message}\n\n💬 You can exit this chat anytime by typing /endchat.`
                            );
                            
                            console.log(`✅ Telegram message sent to ${telegramId}`);
                            
                            // Store message in DB
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
                                }
                            );
                            
                            console.log(`✅ Message saved to DB for ${telegramId}`);
                            
                            // Send confirmation back to admin
                            ws.send(JSON.stringify({
                                type: "message_sent",
                                telegramId,
                                timestamp: new Date().toISOString(),
                                message: "Message sent successfully"
                            }));
                            
                        } catch (error: any) {
                            console.error("❌ Error sending admin reply:", error.message);
                            ws.send(JSON.stringify({
                                type: "error",
                                error: "Failed to send message",
                                details: error.message,
                                timestamp: new Date().toISOString()
                            }));
                        }
                        break;
                    }

                    case "ping": {
                        // Heartbeat to keep connection alive
                        ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
                        break;
                    }

                    default:
                        console.warn("⚠️ Unknown WebSocket message type:", data.type);
                        ws.send(JSON.stringify({
                            type: "error",
                            error: "Unknown message type",
                            timestamp: new Date().toISOString()
                        }));
                }
            } catch (err: any) {
                console.error("❌ Invalid WS message or processing error:", err.message);
                ws.send(JSON.stringify({
                    type: "error",
                    error: "Invalid message format",
                    details: err.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });

        ws.on("close", (code, reason) => {
            const idx = adminClients.findIndex((c) => c.ws === ws);
            if (idx !== -1) {
                adminClients.splice(idx, 1);
                console.log(`❌ Admin disconnected: ${adminId} (code: ${code}, reason: ${reason})`);
            }
        });

        ws.on("error", (error) => {
            console.error(`❌ WebSocket error for admin ${adminId}:`, error.message);
        });
    });

    // Heartbeat to keep connections alive
    const heartbeatInterval = setInterval(() => {
        adminClients.forEach(({ ws, adminId }) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.ping();
                } catch (error: any) {
                    console.error(`❌ Error pinging admin ${adminId}:`, error.message);
                }
            }
        });
    }, 30000); // Ping every 30 seconds

    wss.on("close", () => {
        clearInterval(heartbeatInterval);
        console.log("🌐 WebSocket server closed");
    });

    // --- Global handler accessible from your bot ---
    globalThis.afibe10xChatHandler = {
        /** 📨 Forward user message from Telegram to admin UI */
        async sendToAdmin(telegramId: string, text: string) {
            console.log(`📨 Sending user message to admin: ${telegramId} - ${text}`);
            
            const user = await Afibe10XUserModel.findOne({ telegramId, botType: "afibe10x" });
            if (!user) {
                console.error(`❌ User not found: ${telegramId}`);
                return;
            }

            const payload = JSON.stringify({
                type: "user_message",
                telegramId,
                username: user.username || "Unknown",
                name: user.fullName || "User",
                text,
                time: new Date().toISOString(),
            });

            let sentCount = 0;
            adminClients.forEach(({ ws }) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(payload);
                    sentCount++;
                }
            });
            
            console.log(`✅ User message forwarded to ${sentCount} admin(s)`);
            
            // Store message in DB
            try {
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
                    }
                );
                console.log(`✅ User message stored in DB for ${telegramId}`);
            } catch (error: any) {
                console.error(`❌ Failed to store user message in DB:`, error.message);
            }
        },

        /** 📨 Forward admin message to Telegram bot */
        async sendToUser(telegramId: string, text: string) {
            try {
                await afibe10xBot.telegram.sendMessage(telegramId, text);
                console.log(`✅ Admin message sent to user ${telegramId}`);
            } catch (error: any) {
                console.error(`❌ Failed to send admin message to ${telegramId}:`, error.message);
            }
        },
    };
    
    console.log("✅ Afibe10x WebSocket handler initialized");
}

