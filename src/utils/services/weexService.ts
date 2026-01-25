import axios from "axios";
import crypto from "crypto";

// export class WeexService {
//     private apiKey: string;
//     private secretKey: string;
//     private passphrase: string;
//     private baseUrl = "https://api-spot.weex.com";

//     // Rate limiting properties
//     private queue: Array<() => Promise<void>> = [];
//     private isProcessing = false;
//     private lastRequestTime = 0;
//     private minInterval = 2000; // 2 seconds between requests

//     constructor() {
//         this.apiKey = process.env.WEEX_API_KEY || "";
//         this.secretKey = process.env.WEEX_SECRET_KEY || "";
//         this.passphrase = process.env.WEEX_PASSPHRASE || "";
//     }

//     /**
//      * Generates signature for WEEX API based on the provided Python script.
//      * Message = timestamp + method.upper() + endpoint + params
//      */
//     private generateSignature(
//         method: string,
//         endpoint: string,
//         timestamp: string,
//         queryString: string = ""
//         // params: string = ""
//     ): string {
//         let message = `${timestamp}${method.toUpperCase()}${endpoint}`;

// if (queryString) {
//         // Important: add "?" + queryString even if queryString already starts with "?"
//         // But since your queryString starts with "?", it's fine → becomes ...endpoint?uid=...
//         message += queryString;
//     } else {
//         // Some docs say to append "?" even with no params → but most examples omit it
//         // Start without, but you can test with "?" added if still fails
//         // message += "?";
//     }

//         return crypto
//             .createHmac("sha256", this.secretKey)
//             .update(message)
//             .digest("hex");
//     }

//     /**
//      * Verifies if a UID is a valid referral.
//      * Uses a lock/queue system to prevent hitting rate limits.
//      * @param uid The user's WEEX UID
//      * @returns true if verified, false if invalid referral, null if API error/unknown
//      */
//     async verifyUid(uid: string): Promise<boolean | null> {
//         return new Promise((resolve) => {
//             // Add verification task to queue
//             this.queue.push(async () => {
//                 try {
//                     // Perform verification
//                     const result = await this.performVerification(uid);
//                     resolve(result);
//                 } catch (error) {
//                     console.error("Queue task error:", error);
//                     resolve(null);
//                 }
//             });

//             // Trigger queue processing
//             this.processQueue();
//         });
//     }

//     private async processQueue() {
//         if (this.isProcessing || this.queue.length === 0) return;

//         this.isProcessing = true;

//         while (this.queue.length > 0) {
//             const task = this.queue.shift();
//             if (task) {
//                 // Enforce rate limit delay
//                 const now = Date.now();
//                 const timeSinceLast = now - this.lastRequestTime;
//                 if (timeSinceLast < this.minInterval) {
//                     await new Promise((r) => setTimeout(r, this.minInterval - timeSinceLast));
//                 }

//                 try {
//                     await task();
//                 } catch (e) {
//                     console.error("Task execution failed", e);
//                 }

//                 this.lastRequestTime = Date.now();
//             }
//         }

//         this.isProcessing = false;
//     }

//     private async performVerification(uid: string): Promise<boolean | null> {
//         if (!this.apiKey || !this.secretKey || !this.passphrase) {
//             console.warn(
//                 "⚠️ WEEX API keys (Key, Secret, Passphrase) missing. Skipping automated verification."
//             );
//             return null;
//         }

//         console.log('api-key', this.apiKey);
//         console.log('secret-key', this.secretKey);
//         console.log('passphrase', this.passphrase);

//         try {
//             // Optimization: Single call to getChannelUserTradeAndAsset checks both referral existence and deposit
//             const endpoint = "/api/v2/rebate/affiliate/getChannelUserTradeAndAsset";
//             const queryParams = `?uid=${uid}`;  // only here
//          const timestamp = Date.now().toString();


//             const signature = this.generateSignature("GET", endpoint, timestamp, queryParams);

//             const headers = {
//                 "ACCESS-KEY": this.apiKey,
//                 "ACCESS-SIGN": signature,
//                 "ACCESS-PASSPHRASE": this.passphrase,
//                 "ACCESS-TIMESTAMP": timestamp,
//                 "Content-Type": "application/json",
//                 locale: "zh-CN",
//             };


// // Add debug logging (very helpful)
//         console.log("[WEEX Request Debug]", {
//             fullUrl: `${this.baseUrl}${endpoint}${queryParams}`,
//             timestamp,
//             messageSigned: `${timestamp}GET${endpoint}`,
//             signature,  // log it once to verify
//             headers: { ...headers, "ACCESS-SIGN": "[hidden]" }
//         });


//             const response = await axios.get(
//             `${this.baseUrl}${endpoint}${queryParams}`,
//             { headers, timeout: 10000 }
//         );

//         console.log("[WEEX Response]", JSON.stringify(response.data, null, 2));

//             const data = response.data;

//             // Check if API call was successful and records exist
//             if (data.code !== "200" || !data.data?.records || data.data.records.length === 0) {
//                 if (data.code === "200") {
//                     // API success but no records -> User not found or not a referral
//                     return false;
//                 }
//                 console.warn(`WEEX API Error (Verification): ${JSON.stringify(data)}`);
//                 return null;
//             }

//             // Get the record for this UID
//             const record = data.data.records[0];

//             // Double check strict UID match just in case
//             if (record.uid !== uid) {
//                 return false;
//             }

//             const depositStr = record.depositAmount || "0";
//             const depositValue = parseFloat(depositStr);

//             if (isNaN(depositValue)) {
//                 console.warn(`Invalid deposit value for UID ${uid}: ${depositStr}`);
//                 return false;
//             }

//             return depositValue >= 50;

//         } catch (error: any) {
//             if (axios.isAxiosError(error) && error.response?.status === 429) {
//                 console.error("[WEEX API Error Details]", {
//                 status: error.response.status,
//                 statusText: error.response.statusText,
//                 data: error.response.data,          // ← this will show WEEX's error message!
//                 headers: error.response.headers
//             });
//             } else {
//                 console.error("❌ WEEX Service Error:", error, error.message);
//             }
//             return null;
//         }
//     }
// }

// export const weexService = new WeexService();



export class WeexService {
    private apiKey: string;
    private secretKey: string;
    private passphrase: string;
    private baseUrl = "https://api-spot.weex.com";

    constructor() {
        this.apiKey = process.env.WEEX_API_KEY || "";
        this.secretKey = process.env.WEEX_SECRET_KEY || "";
        this.passphrase = process.env.WEEX_PASSPHRASE || "";
        
        // Validate keys on startup
        if (!this.apiKey || !this.secretKey || !this.passphrase) {
            console.warn("⚠️ WEEX API credentials missing. Verification will be skipped.");
        } else {
            console.log("✅ WEEX API credentials loaded");
        }
    }

    /**
     * Generates signature for WEEX API - UPDATED VERSION
     */
    private generateSignature(
        method: string,
        endpoint: string,
        timestamp: string,
        queryString: string = ""
    ): string {
        // IMPORTANT: WEEX API expects the message in format: timestamp + method + requestPath
        // Where requestPath includes the endpoint + query parameters
        let requestPath = endpoint;
        
        if (queryString) {
            // Add query string to requestPath
            requestPath += queryString;
        }
        
        // Create the message to sign
        const message = `${timestamp}${method.toUpperCase()}${requestPath}`;
        
        console.log("[Signature Debug]", {
            timestamp,
            method: method.toUpperCase(),
            requestPath,
            message,
            secretKeyLength: this.secretKey.length
        });
        
        // Generate HMAC SHA256 signature
        const signature = crypto
            .createHmac("sha256", this.secretKey)
            .update(message)
            .digest("hex");
            
        return signature;
    }

    /**
     * Verifies if a UID is a valid referral
     */
    async verifyUid(uid: string): Promise<boolean | null> {
        // Check if credentials are set
        if (!this.apiKey || !this.secretKey || !this.passphrase) {
            console.warn("⚠️ WEEX API credentials not set. Skipping verification.");
            return null;
        }

        try {
            const endpoint = "/api/v2/rebate/affiliate/getChannelUserTradeAndAsset";
            const queryParams = `?uid=${encodeURIComponent(uid)}`;
            const timestamp = Date.now().toString();
            const method = "GET";
            
            // Generate signature
            const signature = this.generateSignature(method, endpoint, timestamp, queryParams);
            
            const headers = {
                "ACCESS-KEY": this.apiKey,
                "ACCESS-SIGN": signature,
                "ACCESS-PASSPHRASE": this.passphrase,
                "ACCESS-TIMESTAMP": timestamp,
                "Content-Type": "application/json",
                "locale": "zh-CN",
                "User-Agent": "CopyMeBot/1.0"
            };

            // Debug logging
            console.log("[WEEX API Request]", {
                url: `${this.baseUrl}${endpoint}${queryParams}`,
                timestamp,
                signature: signature.substring(0, 16) + "...", // Partial for security
                headers: { ...headers, "ACCESS-SIGN": "[REDACTED]" }
            });

            const response = await axios.get(
                `${this.baseUrl}${endpoint}${queryParams}`,
                { 
                    headers,
                    timeout: 15000,
                    validateStatus: (status) => status < 500 // Don't throw on 400 errors
                }
            );

            console.log("[WEEX API Response]", {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            });

            // Handle different response codes
            if (response.data.code === "200") {
                // Success
                if (response.data.data?.records?.length > 0) {
                    const record = response.data.data.records[0];
                    const depositAmount = parseFloat(record.depositAmount || "0");
                    
                    // Check if deposit meets minimum requirement
                    const isValid = depositAmount >= 50;
                    console.log(`✅ UID ${uid} verification: ${isValid ? "VALID" : "INVALID"} (Deposit: $${depositAmount})`);
                    return isValid;
                } else {
                    console.log(`❌ UID ${uid}: No records found`);
                    return false;
                }
            } else if (response.data.code === "40753") {
                // API key disabled
                console.error("❌ WEEX API key disabled. Please contact WEEX support.");
                return null;
            } else {
                // Other API errors
                console.warn(`⚠️ WEEX API Error [${response.data.code}]: ${response.data.msg}`);
                return null;
            }

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Server responded with error
                    console.error("❌ WEEX API Error:", {
                        status: error.response.status,
                        data: error.response.data,
                        headers: error.response.headers
                    });
                } else if (error.request) {
                    // No response received
                    console.error("❌ WEEX API Network Error: No response received");
                } else {
                    // Request setup error
                    console.error("❌ WEEX API Request Error:", error.message);
                }
            } else {
                console.error("❌ WEEX Service Unexpected Error:", error);
            }
            return null;
        }
    }

    /**
     * Test API connectivity
     */
    async testApiConnection(): Promise<boolean> {
        try {
            console.log("🔧 Testing WEEX API connection...");
            
            if (!this.apiKey || !this.secretKey || !this.passphrase) {
                console.error("❌ API credentials not configured");
                return false;
            }
            
            // Use a simple endpoint to test
            const endpoint = "/api/v2/rebate/affiliate/getChannelUserTradeAndAsset";
            const testUid = "1000000"; // Use a test UID
            const queryParams = `?uid=${testUid}`;
            const timestamp = Date.now().toString();
            const method = "GET";
            
            const signature = this.generateSignature(method, endpoint, timestamp, queryParams);
            
            const headers = {
                "ACCESS-KEY": this.apiKey,
                "ACCESS-SIGN": signature,
                "ACCESS-PASSPHRASE": this.passphrase,
                "ACCESS-TIMESTAMP": timestamp,
                "Content-Type": "application/json",
                "locale": "zh-CN"
            };
            
            const response = await axios.get(
                `${this.baseUrl}${endpoint}${queryParams}`,
                { 
                    headers,
                    timeout: 10000,
                    validateStatus: () => true // Don't throw on any status
                }
            );
            
            console.log("🔧 API Test Response:", {
                status: response.status,
                code: response.data?.code,
                message: response.data?.msg
            });
            
            return true;
            
        } catch (error) {
            console.error("❌ API Test Failed:", error);
            return false;
        }
    }
}

export const weexService = new WeexService();