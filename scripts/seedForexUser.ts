import mongoose from "mongoose";
import dotenv from "dotenv";
import { ForexUserModel, IFOREX_User } from "../src/models/forex_user.model";

dotenv.config();

const seedForexUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("📦 Connected to MongoDB");

    const usersToSeed: Partial<IFOREX_User>[] = [
      {
        telegramId: "200001",
        username: "@forexAlex",
        fullName: "Alex Trader",
        botType: "forex",
        excoTraderLoginId: "EXCO2001",
        registeredVia: "exco",
      },
      {
        telegramId: "200002",
        username: "@pipMaster",
        fullName: "Sarah Pips",
        botType: "forex",
        excoTraderLoginId: "EXCO2002",
        registeredVia: "exco",
      },
      {
        telegramId: "200003",
        username: "@fxJane",
        fullName: "Jane Forex",
        botType: "forex",
        excoTraderLoginId: "EXCO2003",
        registeredVia: "exco",
      },
      {
        telegramId: "200004",
        username: "@traderMike",
        fullName: "Mike Leverage",
        botType: "forex",
        excoTraderLoginId: "EXCO2004",
        registeredVia: "exco",
      },
      {
        telegramId: "200005",
        username: "@fxQueen",
        fullName: "Emma Signals",
        botType: "forex",
        excoTraderLoginId: "EXCO2005",
        registeredVia: "exco",
      },
      {
        telegramId: "200006",
        username: "@lotKing",
        fullName: "Tom Margin",
        botType: "forex",
        excoTraderLoginId: "EXCO2006",
        registeredVia: "exco",
      },
      {
        telegramId: "200007",
        username: "@chartGuru",
        fullName: "Lisa Charts",
        botType: "forex",
        excoTraderLoginId: "EXCO2007",
        registeredVia: "exco",
      },
      {
        telegramId: "200008",
        username: "@swapMaster",
        fullName: "John Swap",
        botType: "forex",
        excoTraderLoginId: "EXCO2008",
        registeredVia: "exco",
      },
      {
        telegramId: "200009",
        username: "@fxWizard",
        fullName: "Nina Trades",
        botType: "forex",
        excoTraderLoginId: "EXCO2009",
        registeredVia: "exco",
      },
      {
        telegramId: "200010",
        username: "@pipWizard",
        fullName: "Dave Forex",
        botType: "forex",
        excoTraderLoginId: "EXCO2010",
        registeredVia: "exco",
      },
    ];

    for (const user of usersToSeed) {
      const exists = await ForexUserModel.findOne({ telegramId: user.telegramId, botType: "forex" });
      if (exists) {
        console.log(`⏩ User with telegramId ${user.telegramId} already exists. Skipping.`);
        continue;
      }

      const newUser = new ForexUserModel({
        ...user,
        isApproved: false,
        isRejected: false,
        status: "pending",
        createdAt: new Date(),
      });

      await newUser.save();
      console.log(`✅ Seeded user ${user.username}`);
    }

    console.log("🎉 Forex user seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedForexUsers();