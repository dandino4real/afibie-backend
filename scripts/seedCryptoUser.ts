import mongoose from "mongoose";
import dotenv from "dotenv";
// import { CryptoUserModel } from "../src/models/crypto-user.model"; // Adjust path as needed

import { CryptoUserModel } from "../src/models/crypto_user.model";

dotenv.config();

const seedCryptoUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("📦 Connected to MongoDB");

    const usersToSeed = [
      {
        telegramId: "100001",
        username: "@cryptoJohn",
        fullName: "John Crypto",
        botType: "crypto",
        country: "Nigeria",
        bybitUid: "BYBIT1001",
        blofinUid: "BLF1001",
        registeredVia: "bybit",
      },
      {
        telegramId: "100002",
        username: "@satoshiN",
        fullName: "Satoshi Nakamoto",
        botType: "crypto",
        country: "Japan",
        bybitUid: "BYBIT1002",
        blofinUid: "BLF1002",
        registeredVia: "bybit",
      },
      {
        telegramId: "100003",
        username: "@cryptoJane",
        fullName: "Jane Doe",
        botType: "crypto",
        country: "USA",
        blofinUid: "BLF1003",
        registeredVia: "blofin",
      },
      {
        telegramId: "100004",
        username: "@blockLee",
        fullName: "Bruce Lee",
        botType: "crypto",
        country: "China",
        bybitUid: "BYBIT1004",
        blofinUid: "BLF1004",
        registeredVia: "bybit",
      },
      {
        telegramId: "100005",
        username: "@ethQueen",
        fullName: "Alice Ethereum",
        botType: "crypto",
        country: "Canada",
        blofinUid: "BLF1005",
        registeredVia: "blofin",
      },
      {
        telegramId: "100006",
        username: "@bitKing",
        fullName: "Tom King",
        botType: "crypto",
        country: "Germany",
        bybitUid: "BYBIT1006",
        blofinUid: "BLF1006",
        registeredVia: "bybit",
      },
      {
        telegramId: "100007",
        username: "@nftGenius",
        fullName: "Sara Art",
        botType: "crypto",
        country: "South Korea",
        bybitUid: "BYBIT1007",
        blofinUid: "BLF1007",
        registeredVia: "blofin",
      },
      {
        telegramId: "100008",
        username: "@hodlMike",
        fullName: "Mike HODL",
        botType: "crypto",
        country: "UK",
        blofinUid: "BLF1008",
        registeredVia: "blofin",
      },
      {
        telegramId: "100009",
        username: "@btcQueen",
        fullName: "Nina BTC",
        botType: "crypto",
        country: "Brazil",
        bybitUid: "BYBIT1009",
        blofinUid: "BLF1009",
        registeredVia: "blofin",
      },
      {
        telegramId: "100010",
        username: "@defiDave",
        fullName: "Dave Defi",
        botType: "crypto",
        country: "India",
        bybitUid: "BYBIT1010",
        blofinUid: "BLF1010",
        registeredVia: "bybit",
      },
    ];

    const blofinOnlyCountries = ["USA", "Canada", "UK"];

    for (const user of usersToSeed) {
      const exists = await CryptoUserModel.findOne({ telegramId: user.telegramId });
      if (exists) {
        console.log(`⏩ User with telegramId ${user.telegramId} already exists. Skipping.`);
        continue;
      }

      const requiresBoth = !blofinOnlyCountries.includes(user.country);

      if (requiresBoth && (!user.bybitUid || !user.blofinUid)) {
        console.warn(`⚠️ Skipping ${user.username} — both bybitUid and blofinUid are required for ${user.country}`);
        continue;
      }

      if (!requiresBoth && !user.blofinUid) {
        console.warn(`⚠️ Skipping ${user.username} — blofinUid is required for ${user.country}`);
        continue;
      }

      const newUser = new CryptoUserModel({
        ...user,
        isApproved: false,
        isRejected: false,
        status: "pending",
        createdAt: new Date(),
      });

      await newUser.save();
      console.log(`✅ Seeded user ${user.username}`);
    }

    console.log("🎉 Crypto user seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedCryptoUsers();
