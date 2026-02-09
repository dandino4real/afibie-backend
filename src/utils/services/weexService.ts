import axios from "axios";
import crypto from "crypto";


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