// src/config/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      writeConcern: { w: "majority" },
      connectTimeoutMS: 15000, // Increased to 15s
      serverSelectionTimeoutMS: 10000, // Increased to 10s
      socketTimeoutMS: 60000, // Increased to 60s
      maxPoolSize: 10, // Connection pooling for serverless
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err; // Let the caller handle retries
  }
}
