import mongoose, { Schema, Document } from "mongoose";

export interface IFOREX_User extends Document {
  telegramId: string;
  username?: string;
  fullName?: string;
  botType:  "forex";
  excoTraderLoginId?: string;
  isApproved: boolean;
  isRejected: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: "no_affiliate_link" | "insufficient_deposit";
  registeredVia?: "exco" ;

  approvedBy?: {
    name: string;
    email: string;
  };
  rejectedBy?: {
    name: string;
    email: string;
  };
}

const UserSchema: Schema = new Schema({
  telegramId: { type: String, required: false, default: "" },
  username: String,
  fullName: String,
  botType: { type: String, enum: ["forex"], required: true },
  excoTraderLoginId: String,
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  registeredVia: { type: String, enum: ["exco"] },
   rejectionReason: {
    type: String,
    enum: ["no_affiliate_link", "insufficient_deposit"],
    required: false,
  },
  approvedBy: {
    name: String,
    email: String,
  },
  rejectedBy: {
    name: String,
    email: String,
  },
});

UserSchema.index({ telegramId: 1, botType: 1 }, { unique: true });

export const ForexUserModel = mongoose.model<IFOREX_User>("ForexUser", UserSchema);
