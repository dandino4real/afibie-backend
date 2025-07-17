// scripts/seedAdmin.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { AdminModel } from "../src/models/admin.model";

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = "ctmastery247@gmail.com" 
    const existing = await AdminModel.findOne({ email });
    if (existing) {
      console.log("AdminModel already exists.");
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

 const admin = new AdminModel({
      name: "June Umeano",
      email,
      password: hashedPassword,
      phone: "+2348123456789",
      role: "superadmin",
      status: "active",
      permissions: ["approve_registration", "reject_registration", "delete_users"],
      refreshToken: null,
      lastIp: "127.0.0.1", 
      lastLogin: new Date(),
      createdAt: new Date(),
      
    });

    await admin.save();
    console.log("✅ AdminModel seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedSuperAdmin();
