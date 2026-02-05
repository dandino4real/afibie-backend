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

  try {
    await mongoose.connect(mongoUri, {
      retryWrites: true,
      writeConcern: { w: "majority" },
      connectTimeoutMS: 15000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
    });
    console.log("✅ MongoDB connected successfully");

   if (process.env.NODE_ENV !== "production") {
      await mongoose.connection.db?.command({ ping: 1 });
      await mongoose.syncIndexes();

    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}
