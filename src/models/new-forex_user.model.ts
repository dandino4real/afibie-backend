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
  loginId_rejectionReason?: "deposit_missing" | "deposit_incomplete" | "duplicate_id" | "wrong_link" | "demo_account" | "other";
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
      enum: ["deposit_missing" , "deposit_incomplete" , "duplicate_id" , "wrong_link" , "demo_account" , "other"],
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
  },
  { timestamps: true }
);

export const FOREX_User = mongoose.model<IFOREX_User>(
  "Forex_User",
  ForexUserSchema
);
