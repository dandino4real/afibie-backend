import mongoose, { Schema, Document } from "mongoose";

export interface IFOREX_User extends Document {
  telegramId: string;
  username?: string;
  fullName?: string;
  firstName?: string;
  country: string;
  broker: string;
  status?: "pending" | "approved" | "rejected";
  loginId: string;
  loginId_status: "awaiting_approval" | "approved" | "rejected";
  loginId_approvedAt?: Date;
  loginId_rejectedAt?: Date;
  loginId_rejectionReason?:
    | "deposit_missing"
    | "deposit_incomplete"
    | "duplicate_id"
    | "wrong_link"
    | "demo_account"
    | "other";
  loginId_customRejectionReason?: string; // ✅ for custom text
  screenshotUrl?: string;
  screenshotUrl_status:
    | "pending"
    | "awaiting_approval"
    | "approved"
    | "rejected";
  screenshotUrl_approvedAt?: Date;
  screenshotUrl_rejectedAt?: Date;
  screenshotUrl_rejectionReason?: "blurry_image" | "wrong_screenshot" | "other";
  screenshotUrl_customRejectionReason?: string; // ✅ for custom text
  testTradesScreenshotUrl?: string;
  testTradesScreenshotUrl_status?:
    | "pending"
    | "awaiting_approval"
    | "approved"
    | "rejected";
  testTradesScreenshotUrl_approvedAt?: Date;
  testTradesScreenshotUrl_rejectedAt?: Date;
  testTradesScreenshotUrl_rejectionReason?:
    | "blurry_image"
    | "wrong_screenshot"
    | "other";
  testTradesScreenshotUrl_customRejectionReason?: string; // ✅ for custom text
  botType: "forex_new" | "crypto" | "other"; // Always 'forex_new' for this model
  messages: {
    sender: "user" | "admin";
    user: "User" | "Admin";
    text: string;
    readByAdmin: { type: Boolean; default: false };
    timestamp: Date;
  }[];
  mode: "default" | "chat";
  createdAt: Date;
  updatedAt: Date;
}

const ForexUserSchema = new Schema<IFOREX_User>(
  {
    telegramId: { type: String, required: true },
    username: { type: String },
    fullName: { type: String },
    firstName: { type: String },
    country: { type: String, required: true },
    broker: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    loginId: { type: String, required: true },
    loginId_status: {
      type: String,
      enum: ["awaiting_approval", "approved", "rejected"],
      default: "awaiting_approval",
    },
    loginId_approvedAt: Date,
    loginId_rejectedAt: Date,
    loginId_rejectionReason: {
      type: String,
      enum: [
        "deposit_missing",
        "deposit_incomplete",
        "duplicate_id",
        "wrong_link",
        "demo_account",
        "other",
      ],
    },
    loginId_customRejectionReason: {
      type: String,
      default: null,
    },
    screenshotUrl: { type: String },
    screenshotUrl_status: {
      type: String,
      enum: ["pending", "awaiting_approval", "approved", "rejected"],
      default: "pending",
    },
    screenshotUrl_approvedAt: Date,
    screenshotUrl_rejectedAt: Date,
    screenshotUrl_rejectionReason: {
      type: String,
      enum: ["blurry_image", "wrong_screenshot", "other"],
    },
    screenshotUrl_customRejectionReason: { type: String }, // ✅ optional custom text
    testTradesScreenshotUrl: { type: String },
    testTradesScreenshotUrl_status: {
      type: String,
      enum: ["pending", "awaiting_approval", "approved", "rejected"],
      default: "pending",
    },
    testTradesScreenshotUrl_approvedAt: Date,
    testTradesScreenshotUrl_rejectedAt: Date,
    testTradesScreenshotUrl_rejectionReason: {
      type: String,
      enum: ["blurry_image", "wrong_screenshot", "other"],
    },
    testTradesScreenshotUrl_customRejectionReason: { type: String },
    botType: {
      type: String,
      enum: ["forex_new", "crypto", "other"],
      default: "forex_new", // Always default to forex_new for this model
      required: true,
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "admin"], required: true },
        user: { type: String, enum: ["User", "Admin"], required: true },
        text: { type: String, required: true },
        readByAdmin: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    mode: {
      type: String,
      enum: ["default", "chat"],
      default: "default",
    },
  },
  { timestamps: true }
);

export const FOREX_User = mongoose.model<IFOREX_User>(
  "Forex_User",
  ForexUserSchema
);
