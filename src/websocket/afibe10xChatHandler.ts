

// import WebSocket, { WebSocketServer } from "ws";
// import { Afibe10XUserModel } from "../models/afibe10x_user.model";
// import { Telegraf } from "telegraf";
// import Redis from "ioredis";

// // --- Extend globalThis so TypeScript knows about afibe10xChatHandler ---
// declare global {
//     // eslint-disable-next-line no-var
//     var afibe10xChatHandler:
//         | {
//             sendToAdmin: (telegramId: string, text: string) => Promise<void>;
//             sendToUser: (telegramId: string, text: string) => Promise<void>;
//         }
//         | undefined;
// }

// // ✅ Setup Redis (optional: use your existing connection if available)
// const redis = new Redis(process.env.REDIS_URL || "");

// // --- WebSocket client tracking ---
// interface ConnectedClient {
//     adminId: string;
//     ws: WebSocket;
// }

// const adminClients: ConnectedClient[] = [];

// // ✅ Main setup function
// export function setupAfibe10xWebSocket(server: any, afibe10xBot: Telegraf<any>) {
//     const wss = new WebSocketServer({ 
//         server,
//         // path: "/afibe10x-chat",   
//         // No verifyClient, no perMessageDeflate, no noServer
//           verifyClient: (info: any, cb: (verified: boolean, code?: number, message?: string) => void) => {
//             console.log("🔍 verifyClient called for:", info.req.url);
//             // Check if the path is correct
//             if (info.req.url?.startsWith("/afibe10x-chat")) {
//                 console.log("✅ Accepting WebSocket connection for path:", info.req.url);
//                 cb(true);
//             } else {
//                 console.warn("⚠️ Rejecting WebSocket connection for path:", info.req.url);
//                 cb(false, 404, "Not Found");
//             }
//         }
//     });

    
//     console.log("🌐 WebSocket server for Afibe10x Chat started on /afibe10x-chat");

//     wss.on('wsClientError', (err, socket, req) => {
//     console.error("[WS CLIENT ERROR] Upgrade handshake failed!");
//     console.error("[WS CLIENT ERROR] Error:", err.message);
//     console.error("[WS CLIENT ERROR] Request path:", req.url);
//     console.error("[WS CLIENT ERROR] Headers:", req.headers);
//     socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');  // Explicitly reject
// });

//     wss.on("connection", (ws, req) => {
//         console.log("🔗 New WebSocket connection attempt:", req.url);
        
//         const params = new URLSearchParams(req.url?.split("?")[1] || "");
//         const adminId = params.get("adminId") || "unknown";

        
//         console.log(`✅ Admin connected to Afibe10x Chat: ${adminId}`);
//         adminClients.push({ adminId, ws });

//         // Send connection confirmation
//         ws.send(JSON.stringify({ 
//             type: "connection_established", 
//             adminId,
//             timestamp: new Date().toISOString(),
//             message: "WebSocket connection established successfully"
//         }));

//         // --- Handle messages from admin UI ---
//         ws.on("message", async (msg) => {
//             try {
//                 console.log("📨 Received WebSocket message:", msg.toString());
//                 const data = JSON.parse(msg.toString());

//                 switch (data.type) {
//                     case "start_chat": {
//                         const { telegramId } = data;
//                         console.log(`🚀 Starting chat for telegramId: ${telegramId}`);
                        
//                         const sessionKey = `afibe10x:${telegramId}`;
//                         const sessionData = await redis.get(sessionKey);

//                         if (sessionData) {
//                             const session = JSON.parse(sessionData);
//                             session.mode = "chat";
//                             await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
//                             console.log(`✅ Session updated to chat mode for ${telegramId}`);
//                         } else {
//                             console.log(`⚠️ No session found for ${telegramId}, creating new one`);
//                             const session = { mode: "chat", step: "chat", botType: "afibe10x", retryCount: 0 };
//                             await redis.set(sessionKey, JSON.stringify(session), "EX", 86400);
//                         }

//                         // Send confirmation back to admin
//                         ws.send(JSON.stringify({
//                             type: "chat_started",
//                             telegramId,
//                             timestamp: new Date().toISOString(),
//                             message: "Chat session started successfully"
//                         }));
                        
//                         // Notify user via Telegram
//                         try {
//                             await afibe10xBot.telegram.sendMessage(
//                                 telegramId,
//                                 "💬 Admin has joined the chat. You can now send messages directly."
//                             );
//                             console.log(`✅ Telegram notification sent to ${telegramId}`);
//                         } catch (telegramErr: any) {
//                             console.error("❌ Failed to send Telegram notification:", telegramErr.message);
//                         }
//                         break;
//                     }

//                     case "admin_reply": {
//                         const { telegramId, message } = data;
//                         console.log(`📤 Admin reply to ${telegramId}: ${message}`);
                        
//                         try {
//                             // Send message to user via Telegram
//                             await afibe10xBot.telegram.sendMessage(
//                                 telegramId,
//                                 `👨‍💼 Admin: ${message}\n\n💬 You can exit this chat anytime by typing /endchat.`
//                             );
                            
//                             console.log(`✅ Telegram message sent to ${telegramId}`);
                            
//                             // Store message in DB
//                             await Afibe10XUserModel.updateOne(
//                                 { telegramId, botType: "afibe10x" },
//                                 {
//                                     $push: {
//                                         messages: {
//                                             sender: "admin",
//                                             user: "Admin",
//                                             text: message,
//                                             readByAdmin: true,
//                                             timestamp: new Date(),
//                                         },
//                                     },
//                                 }
//                             );
                            
//                             console.log(`✅ Message saved to DB for ${telegramId}`);
                            
//                             // Send confirmation back to admin
//                             ws.send(JSON.stringify({
//                                 type: "message_sent",
//                                 telegramId,
//                                 timestamp: new Date().toISOString(),
//                                 message: "Message sent successfully"
//                             }));
                            
//                         } catch (error: any) {
//                             console.error("❌ Error sending admin reply:", error.message);
//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 error: "Failed to send message",
//                                 details: error.message,
//                                 timestamp: new Date().toISOString()
//                             }));
//                         }
//                         break;
//                     }

//                     case "ping": {
//                         // Heartbeat to keep connection alive
//                         ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
//                         break;
//                     }

//                     default:
//                         console.warn("⚠️ Unknown WebSocket message type:", data.type);
//                         ws.send(JSON.stringify({
//                             type: "error",
//                             error: "Unknown message type",
//                             timestamp: new Date().toISOString()
//                         }));
//                 }
//             } catch (err: any) {
//                 console.error("❌ Invalid WS message or processing error:", err.message);
//                 ws.send(JSON.stringify({
//                     type: "error",
//                     error: "Invalid message format",
//                     details: err.message,
//                     timestamp: new Date().toISOString()
//                 }));
//             }
//         });

//         ws.on("close", (code, reason) => {
//             const idx = adminClients.findIndex((c) => c.ws === ws);
//             if (idx !== -1) {
//                 adminClients.splice(idx, 1);
//                 console.log(`❌ Admin disconnected: ${adminId} (code: ${code}, reason: ${reason})`);
//             }
//         });

//         ws.on("error", (error) => {
//             console.error(`❌ WebSocket error for admin ${adminId}:`, error.message);
//         });
//     });

//     // Heartbeat to keep connections alive
//     const heartbeatInterval = setInterval(() => {
//         adminClients.forEach(({ ws, adminId }) => {
//             if (ws.readyState === WebSocket.OPEN) {
//                 try {
//                     ws.ping();
//                 } catch (error: any) {
//                     console.error(`❌ Error pinging admin ${adminId}:`, error.message);
//                 }
//             }
//         });
//     }, 30000); // Ping every 30 seconds

//     wss.on("close", () => {
//         clearInterval(heartbeatInterval);
//         console.log("🌐 WebSocket server closed");
//     });

//     // --- Global handler accessible from your bot ---
//     globalThis.afibe10xChatHandler = {
//         /** 📨 Forward user message from Telegram to admin UI */
//         async sendToAdmin(telegramId: string, text: string) {
//             console.log(`📨 Sending user message to admin: ${telegramId} - ${text}`);
            
//             const user = await Afibe10XUserModel.findOne({ telegramId, botType: "afibe10x" });
//             if (!user) {
//                 console.error(`❌ User not found: ${telegramId}`);
//                 return;
//             }

//             const payload = JSON.stringify({
//                 type: "user_message",
//                 telegramId,
//                 username: user.username || "Unknown",
//                 name: user.fullName || "User",
//                 text,
//                 time: new Date().toISOString(),
//             });

//             let sentCount = 0;
//             adminClients.forEach(({ ws }) => {
//                 if (ws.readyState === WebSocket.OPEN) {
//                     ws.send(payload);
//                     sentCount++;
//                 }
//             });
            
//             console.log(`✅ User message forwarded to ${sentCount} admin(s)`);
            
//             // Store message in DB
//             try {
//                 await Afibe10XUserModel.updateOne(
//                     { telegramId, botType: "afibe10x" },
//                     {
//                         $push: {
//                             messages: {
//                                 sender: "user",
//                                 user: "User",
//                                 text,
//                                 readByAdmin: false,
//                                 timestamp: new Date(),
//                             },
//                         },
//                     }
//                 );
//                 console.log(`✅ User message stored in DB for ${telegramId}`);
//             } catch (error: any) {
//                 console.error(`❌ Failed to store user message in DB:`, error.message);
//             }
//         },

//         /** 📨 Forward admin message to Telegram bot */
//         async sendToUser(telegramId: string, text: string) {
//             try {
//                 await afibe10xBot.telegram.sendMessage(telegramId, text);
//                 console.log(`✅ Admin message sent to user ${telegramId}`);
//             } catch (error: any) {
//                 console.error(`❌ Failed to send admin message to ${telegramId}:`, error.message);
//             }
//         },
//     };
    
//     console.log("✅ Afibe10x WebSocket handler initialized");
// }


import WebSocket, { WebSocketServer } from "ws";
import { Afibe10XUserModel } from "../models/afibe10x_user.model";
import { Telegraf } from "telegraf";
import Redis from "ioredis";
import { IncomingMessage } from "http";
import * as crypto from "crypto";

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

// ✅ Main setup function
export function setupAfibe10xWebSocket(server: any, afibe10xBot: Telegraf<any>) {
    console.log("🌐 Initializing WebSocket server for Afibe10x Chat...");

    // Create WebSocket server - Use the standard approach without manual handshake
    const wss = new WebSocketServer({ 
        noServer: true,
        perMessageDeflate: false,
        maxPayload: 10 * 1024 * 1024,
    });

    // Track upgrade attempts to prevent duplicate handling
    const upgradeAttempts = new Map<string, number>();
    const MAX_ATTEMPTS = 3;

    // Handle HTTP server upgrade events
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
        const clientKey = request.headers['sec-websocket-key'] || 'unknown';
        const currentAttempts = (upgradeAttempts.get(clientKey) || 0) + 1;
        upgradeAttempts.set(clientKey, currentAttempts);

        console.log("🔄 HTTP Upgrade attempt:", {
            url: request.url,
            attempt: currentAttempts,
            clientKey: clientKey.substring(0, 10) + '...'
        });

        // Prevent too many attempts
        if (currentAttempts > MAX_ATTEMPTS) {
            console.log("❌ Too many upgrade attempts, closing socket");
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
            socket.destroy();
            return;
        }

        // Check if this is our WebSocket endpoint
        if (!request.url?.includes('/afibe10x-chat')) {
            console.log("❌ Path not matched, destroying socket");
            socket.destroy();
            return;
        }

        console.log("✅ Matched WebSocket endpoint");

        try {
            // Parse URL to get query parameters
            const baseUrl = `http://${request.headers.host || 'localhost'}`;
            const url = new URL(request.url, baseUrl);
            const adminId = url.searchParams.get('adminId');

            if (!adminId) {
                console.log("❌ No adminId provided");
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\nMissing adminId parameter');
                socket.destroy();
                return;
            }

            console.log(`🔐 Admin ID: ${adminId}`);

            // Handle the WebSocket upgrade using the standard method
            wss.handleUpgrade(request, socket, head, (ws) => {
                console.log("🎉 WebSocket upgrade successful!");
                
                // Clean up the attempts tracking after successful upgrade
                upgradeAttempts.delete(clientKey);
                
                // Emit the connection event
                wss.emit('connection', ws, request);
            });

        } catch (error: any) {
            console.error("❌ Error during WebSocket upgrade:", error.message);
            
            // Clean up on error
            upgradeAttempts.delete(clientKey);
            
            try {
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            } catch (e) {
                // Socket might already be closed
            }
            socket.destroy();
        }
    });

    // WebSocket connection handler
    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        console.log("🔗 New WebSocket connection established!");
        
        // Extract adminId from URL
        let adminId = 'unknown';
        try {
            const baseUrl = `http://${req.headers.host || 'localhost'}`;
            const url = new URL(req.url || '/', baseUrl);
            adminId = url.searchParams.get('adminId') || 'unknown';
        } catch (error) {
            console.error("❌ Error parsing URL:", error);
        }

        console.log(`✅ Admin connected: ${adminId}`);
        
        // Add to connected clients
        const client: ConnectedClient = { adminId, ws };
        adminClients.push(client);
        console.log(`📈 Total connected admins: ${adminClients.length}`);

        // Add connection timeout to ensure proper handshake
        const connectionTimeout = setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.log(`⚠️ Connection timeout for admin ${adminId}, closing`);
                ws.close(1006, 'Connection timeout');
            }
        }, 5000);

        // Send connection confirmation when WebSocket is ready
        const sendConnectionConfirmation = () => {
            clearTimeout(connectionTimeout);
            
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({
                        type: "connection_established",
                        adminId,
                        timestamp: new Date().toISOString(),
                        message: "WebSocket connection established successfully",
                        clientCount: adminClients.length
                    }));
                    console.log(`✅ Connection confirmation sent to admin ${adminId}`);
                } catch (error: any) {
                    console.error(`❌ Failed to send connection confirmation:`, error.message);
                }
            } else {
                console.warn(`⚠️ WebSocket not open for admin ${adminId}, state: ${ws.readyState}`);
                // Try again in 250ms if still connecting
                if (ws.readyState === WebSocket.CONNECTING) {
                    setTimeout(sendConnectionConfirmation, 250);
                }
            }
        };

        // Wait for WebSocket to be fully opened
        ws.on('open', () => {
            console.log(`✅ WebSocket opened for admin ${adminId}`);
            sendConnectionConfirmation();
        });

        // --- Handle messages from admin UI ---
        ws.on("message", async (data: WebSocket.Data) => {
            try {
                const message = data.toString();
                console.log("📨 Received WebSocket message from admin:", adminId, message.substring(0, 100) + '...');
                
                const parsedData = JSON.parse(message);

                switch (parsedData.type) {
                    case "start_chat": {
                        const { telegramId } = parsedData;
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
                        const { telegramId, message } = parsedData;
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
                        ws.send(JSON.stringify({ 
                            type: "pong", 
                            timestamp: new Date().toISOString(),
                            adminId 
                        }));
                        break;
                    }

                    case "test": {
                        // Test endpoint for debugging
                        ws.send(JSON.stringify({
                            type: "test_response",
                            message: "WebSocket server is working",
                            timestamp: new Date().toISOString(),
                            adminId,
                            clientCount: adminClients.length
                        }));
                        break;
                    }

                    default:
                        console.warn("⚠️ Unknown WebSocket message type:", parsedData.type);
                        ws.send(JSON.stringify({
                            type: "error",
                            error: "Unknown message type",
                            receivedType: parsedData.type,
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

        ws.on("close", (code: number, reason: Buffer) => {
            const idx = adminClients.findIndex((c) => c.ws === ws);
            if (idx !== -1) {
                const disconnectedAdmin = adminClients[idx];
                adminClients.splice(idx, 1);
                console.log(`❌ Admin disconnected: ${disconnectedAdmin.adminId} (code: ${code}, reason: ${reason.toString() || 'No reason'})`);
                console.log(`📉 Total connected admins: ${adminClients.length}`);
            }
        });

        ws.on("error", (error: Error) => {
            console.error(`❌ WebSocket error for admin ${adminId}:`, error.message);
        });

        ws.on("pong", () => {
            console.log(`💓 Received pong from admin ${adminId}`);
        });
    });

    // Handle WebSocket server errors
    wss.on('error', (error: Error) => {
        console.error("❌ WebSocket server error:", error.message);
    });

    // Heartbeat to keep connections alive
    const heartbeatInterval = setInterval(() => {
        adminClients.forEach(({ ws, adminId }, index) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.ping();
                    console.log(`💓 Sent ping to admin ${adminId} (${index + 1}/${adminClients.length})`);
                } catch (error: any) {
                    console.error(`❌ Error pinging admin ${adminId}:`, error.message);
                }
            } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                console.log(`⚠️ Admin ${adminId} WebSocket is closed/closing`);
            }
        });
    }, 30000);

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
            adminClients.forEach(({ ws, adminId }) => {
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(payload);
                        sentCount++;
                        console.log(`✅ Message forwarded to admin ${adminId}`);
                    } catch (error: any) {
                        console.error(`❌ Failed to send message to admin ${adminId}:`, error.message);
                    }
                }
            });
            
            console.log(`✅ User message forwarded to ${sentCount} admin(s) out of ${adminClients.length} total`);
            
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
    
    console.log("✅ Afibe10x WebSocket handler initialized successfully");
    
    return wss;
}