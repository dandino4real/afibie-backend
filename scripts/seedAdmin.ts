import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { AdminModel } from "../src/models/admin.model";

dotenv.config();

const seedMultipleAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const defaultPassword = "Admin@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const adminsToSeed = [
      {
        name: "Alice Johnson",
        email: "alice.admin@example.com",
        phone: "+2348011111111",
        permissions: ["approve_registration", "reject_registration"],
      },
      {
        name: "Bob Smith",
        email: "bob.admin@example.com",
        phone: "+2348022222222",
        permissions: ["approve_registration"],
      },
      {
        name: "Carol Williams",
        email: "carol.admin@example.com",
        phone: "+2348033333333",
        permissions: ["reject_registration", "delete_users"],
      },
      {
        name: "David Brown",
        email: "david.admin@example.com",
        phone: "+2348044444444",
        permissions: ["approve_registration", "delete_users"],
      },
      {
        name: "Eve Davis",
        email: "eve.admin@example.com",
        phone: "+2348055555555",
        permissions: [],
      },
      {
        name: "Frank Miller",
        email: "frank.admin@example.com",
        phone: "+2348066666666",
        permissions: ["approve_registration", "reject_registration"],
      },
      {
        name: "Grace Lee",
        email: "grace.admin@example.com",
        phone: "+2348077777777",
        permissions: ["approve_registration"],
      },
    ];

    for (const adminData of adminsToSeed) {
      const existing = await AdminModel.findOne({ email: adminData.email });
      if (existing) {
        console.log(`⏩ Admin ${adminData.email} already exists. Skipping.`);
        continue;
      }

      const newAdmin = new AdminModel({
        ...adminData,
        password: hashedPassword,
        role: "admin",
        status: "inactive", // superadmin needs to activate
        refreshToken: null,
        lastIp: null,
        lastLogin: null,
        createdAt: new Date(),
      });

      await newAdmin.save();
      console.log(`✅ Admin ${adminData.email} seeded successfully`);
    }

    console.log("🎉 All admins processed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedMultipleAdmins();
