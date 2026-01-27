// import WebSocket, { WebSocketServer } from "ws";
// import { FOREX_User } from "../models/new-forex_user.model";
// import { Telegraf } from "telegraf";
// import Redis from "ioredis";

// // --- Extend globalThis so TypeScript knows about forexChatHandler ---
// declare global {
//   // eslint-disable-next-line no-var
//   var forexChatHandler:
//     | {
//         sendToAdmin: (telegramId: string, text: string) => Promise<void>;
//         sendToUser: (telegramId: string, text: string) => Promise<void>;
//       }
//     | undefined;
// }

// // ✅ Setup Redis (optional: use your existing connection if available)
// const redis = new Redis(process.env.REDIS_URL || "");

// // --- WebSocket client tracking ---
// interface ConnectedClient {
//   adminId: string;
//   ws: WebSocket;
// }

// const adminClients: ConnectedClient[] = [];

// // ✅ Main setup function
// export function setupForexWebSocket(server: any, forexBot: Telegraf<any>) {
//   const wss = new WebSocketServer({ server, path: "/forex-chat" });
//   console.log("🌐 WebSocket server for Forex Chat started");

//   wss.on("connection", (ws, req) => {
//     const params = new URLSearchParams(req.url?.split("?")[1]);
//     const adminId = params.get("adminId") || "unknown";

//     adminClients.push({ adminId, ws });
//     console.log(`✅ Admin connected to Forex Chat: ${adminId}`);

//     // --- Handle messages from admin UI ---
//     ws.on("message", async (msg) => {
//       try {
//         const data = JSON.parse(msg.toString());

//         switch (data.type) {
//           case "start_chat": {
//             const { telegramId } = data;
//             const sessionKey = `forex_new:${telegramId}`;
//             const sessionData = await redis.get(sessionKey);

//             if (sessionData) {
//               const session = JSON.parse(sessionData);
//               session.mode = "chat";
//               await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

//               await forexBot.telegram.sendMessage(
//                 telegramId,
//                 "💬 Admin has joined the chat. You can now send messages directly."
//               );
//             }
//             break;
//           }

//           case "admin_reply": {
//             const { telegramId, message } = data;
//             await forexBot.telegram.sendMessage(
//               telegramId,
//               `👨‍💼 Admin: ${message}`
//             );
//             // 💡 Then send a helpful reminder about /endchat
//             await forexBot.telegram.sendMessage(
//               telegramId,
//               "💬 You can exit this chat anytime by typing /endchat."
//             );

//             // Store message in DB
//             await FOREX_User.updateOne(
//               { telegramId },
//               {
//                 $push: {
//                   messages: {
//                     // from: "admin",
//                     sender: "admin",
//                     user: "Admin",
//                     text: message,
//                     readByAdmin: true, // Explicitly unread
//                     timestamp: new Date(),
//                   },
//                 },
//               }
//             );
//             break;
//           }

//           case "end_chat": {
//             const { telegramId } = data;
//             const sessionKey = `forex_new:${telegramId}`;
//             const sessionData = await redis.get(sessionKey);
//             if (sessionData) {
//               const session = JSON.parse(sessionData);
//               delete session.mode;
//               await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);

//               await forexBot.telegram.sendMessage(
//                 telegramId,
//                 "✅ Chat session ended. You can continue using the bot normally."
//               );
//             }
//             break;
//           }

//           default:
//             console.warn("⚠️ Unknown WebSocket message type:", data.type);
//         }
//       } catch (err) {
//         console.error("❌ Invalid WS message:", err);
//       }
//     });

//     ws.on("close", () => {
//       const idx = adminClients.findIndex((c) => c.ws === ws);
//       if (idx !== -1) adminClients.splice(idx, 1);
//       console.log(`❌ Admin disconnected: ${adminId}`);
//     });
//   });

//   // --- Global handler accessible from your bot ---
//   globalThis.forexChatHandler = {
//     /** 📨 Forward user message from Telegram to admin UI */
//     async sendToAdmin(telegramId: string, text: string) {
//       const user = await FOREX_User.findOne({ telegramId });
//       if (!user) return;

//       const payload = JSON.stringify({
//         type: "user_message",
//         telegramId,
//         username: user.username,
//         name: user.fullName,
//         text,
//         time: new Date().toISOString(),
//       });

//       adminClients.forEach(({ ws }) => {
//         if (ws.readyState === WebSocket.OPEN) ws.send(payload);
//       });
//     },

//     /** 📨 Forward admin message to Telegram bot */
//     async sendToUser(telegramId: string, text: string) {
//       await forexBot.telegram.sendMessage(telegramId, text);
//     },
//   };
// }







import WebSocket, { WebSocketServer } from "ws";
import { FOREX_User } from "../models/new-forex_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";

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

// ✅ Main setup function - FIXED VERSION
export function setupForexWebSocket(server: any, forexBot: Telegraf<any>) {
  console.log("🌐 Initializing Forex WebSocket server...");
  
  const wss = new WebSocketServer({ 
    server, 
    // path: "/forex-chat",
    verifyClient: (info, cb) => {
        const url = info.req.url || '';
        if (url.startsWith('/forex-chat')) {
            cb(true);
        } else {
            cb(false, 404, 'Not Found');
        }
    },
    // perMessageDeflate: false // Disable compression to avoid frame issues
  });

  // NEW: Log every upgrade attempt
// wss.on('upgrade', (request, socket, head) => {
//     console.log('[WS UPGRADE EVENT] Upgrade request received');
//     console.log('[WS UPGRADE EVENT] URL:', request.url);
//     console.log('[WS UPGRADE EVENT] Headers:', JSON.stringify(request.headers, null, 2));
//     console.log('[WS UPGRADE EVENT] Remote address:', socket.remoteAddress);
// });
  
  console.log("✅ WebSocket server for Forex Chat started on /forex-chat");

  wss.on("connection", (ws, req) => {
    console.log("🔗 New Forex WebSocket connection:", req.url);
    
    const params = new URLSearchParams(req.url?.split("?")[1] || "");
    const adminId = params.get("adminId") || "unknown";
    
    console.log(`✅ Admin connected to Forex Chat: ${adminId}`);
    adminClients.push({ adminId, ws });

    // Send immediate connection confirmation
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "connection_established", 
        adminId,
        timestamp: new Date().toISOString(),
        message: "Forex Chat WebSocket connected successfully"
      }));
    }

    // --- Handle messages from admin UI ---
    ws.on("message", async (msg) => {
      try {
        console.log("📨 Received Forex WebSocket message:", msg.toString());
        const data = JSON.parse(msg.toString());

        switch (data.type) {
          case "start_chat": {
            const { telegramId } = data;
            console.log(`🚀 Starting forex chat for telegramId: ${telegramId}`);
            
            const sessionKey = `forex:${telegramId}`;
            const sessionData = await redis.get(sessionKey);

            if (sessionData) {
              const session = JSON.parse(sessionData);
              session.mode = "chat";
              await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
              console.log(`✅ Forex session updated to chat mode for ${telegramId}`);
            }

            // Send confirmation back to admin
            ws.send(JSON.stringify({
              type: "chat_started",
              telegramId,
              timestamp: new Date().toISOString(),
              message: "Forex chat session started"
            }));
            
            // Notify user via Telegram
            try {
              await forexBot.telegram.sendMessage(
                telegramId,
                "💬 Admin has joined the chat. You can now send messages directly."
              );
              console.log(`✅ Forex Telegram notification sent to ${telegramId}`);
            } catch (telegramErr: any) {
              console.error("❌ Failed to send Forex Telegram notification:", telegramErr.message);
            }
            break;
          }

          case "admin_reply": {
            const { telegramId, message } = data;
            console.log(`📤 Admin reply to ${telegramId}: ${message}`);
            
            try {
              // Send message to user via Telegram
              await forexBot.telegram.sendMessage(
                telegramId,
                `👨‍💼 Admin: ${message}\n\n💬 You can exit this chat anytime by typing /endchat.`
              );
              
              console.log(`✅ Forex Telegram message sent to ${telegramId}`);
              
              // Store message in DB
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
              
              console.log(`✅ Forex message saved to DB for ${telegramId}`);
              
              // Send confirmation back to admin
              ws.send(JSON.stringify({
                type: "message_sent",
                telegramId,
                timestamp: new Date().toISOString(),
                message: "Forex message sent successfully"
              }));
              
            } catch (error: any) {
              console.error("❌ Error sending forex admin reply:", error.message);
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
            console.warn("⚠️ Unknown Forex WebSocket message type:", data.type);
            ws.send(JSON.stringify({
              type: "error",
              error: "Unknown message type",
              timestamp: new Date().toISOString()
            }));
        }
      } catch (err: any) {
        console.error("❌ Invalid Forex WS message or processing error:", err.message);
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
        console.log(`❌ Admin disconnected from Forex Chat: ${adminId} (code: ${code}, reason: ${reason})`);
      }
    });

    ws.on("error", (error) => {
      console.error(`❌ Forex WebSocket error for admin ${adminId}:`, error.message);
    });
  });

  // Heartbeat to keep connections alive
  const heartbeatInterval = setInterval(() => {
    adminClients.forEach(({ ws, adminId }) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error: any) {
          console.error(`❌ Error pinging forex admin ${adminId}:`, error.message);
        }
      }
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    console.log("🌐 Forex WebSocket server closed");
  });

  // --- Global handler accessible from your bot ---
  globalThis.forexChatHandler = {
    /** 📨 Forward user message from Telegram to admin UI */
    async sendToAdmin(telegramId: string, text: string) {
      console.log(`📨 Sending forex user message to admin: ${telegramId} - ${text}`);
      
      const user = await FOREX_User.findOne({ telegramId });
      if (!user) {
        console.error(`❌ Forex user not found: ${telegramId}`);
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
      
      console.log(`✅ Forex user message forwarded to ${sentCount} admin(s)`);
      
      // Store message in DB
      try {
        await FOREX_User.updateOne(
          { telegramId },
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
        console.log(`✅ Forex user message stored in DB for ${telegramId}`);
      } catch (error: any) {
        console.error(`❌ Failed to store forex user message in DB:`, error.message);
      }
    },

    /** 📨 Forward admin message to Telegram bot */
    async sendToUser(telegramId: string, text: string) {
      try {
        await forexBot.telegram.sendMessage(telegramId, text);
        console.log(`✅ Forex admin message sent to user ${telegramId}`);
      } catch (error: any) {
        console.error(`❌ Failed to send forex admin message to ${telegramId}:`, error.message);
      }
    },
  };
  
  console.log("✅ Forex WebSocket handler initialized successfully");
}
