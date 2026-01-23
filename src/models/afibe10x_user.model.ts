import mongoose, { Schema, Document } from "mongoose";

export interface IAfibe10X_User extends Document {
  telegramId: string;
  username?: string;
  fullName?: string;
  botType: "afibe10x";
  userId?: string; // WEEX UID
  status: "approved" | "pending" | "rejected";
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: "no_deposit" | "wrong_link";

  approvedBy?: {
    name: string;
    email: string;
  };
  rejectedBy?: {
    name: string;
    email: string;
  };
  mode: "default" | "chat";
  messages: {
    sender: "user" | "admin";
    user?: string;
    text: string;
    readByAdmin: boolean;
    timestamp: Date;
  }[];
}

const UserSchema: Schema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  fullName: String,
  botType: { type: String, enum: ["afibe10x"], required: true, default: "afibe10x" },
  userId: String, // WEEX UID
  status: {
    type: String,
    enum: ["approved", "pending", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: {
    type: String,
    enum: ["no_deposit", "wrong_link"],
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
  mode: { type: String, enum: ["default", "chat"], default: "default" },
  messages: [
    {
      sender: { type: String, enum: ["user", "admin"] },
      user: String,
      text: String,
      readByAdmin: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export const Afibe10XUserModel = mongoose.model<IAfibe10X_User>(
  "Afibe10XUser",
  UserSchema
);
