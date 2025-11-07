import { FOREX_User } from "../models/new-forex_user.model";

export const ForexUserDAL = {
  async findAll({
    page,
    limit,
    search,
    country,
    broker,
    loginId_status,
    screenshotUrl_status,
    testTradesScreenshotUrl_status,
    hasUnReadMessages,
    
  }: any) {
    const query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { broker: { $regex: search, $options: "i" } },
        { loginId: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
      ];
    }

    if (country) query.country = country;
    if (broker) query.broker = broker;
    if (loginId_status) query.loginId_status = loginId_status;
    if (screenshotUrl_status) query.screenshotUrl_status = screenshotUrl_status;
    if (testTradesScreenshotUrl_status)
      query.testTradesScreenshotUrl_status = testTradesScreenshotUrl_status;


    if (typeof hasUnReadMessages === "boolean") {
      // Use $expr to allow aggregation operators in the query.
      // This allows us to inspect the LAST element of the messages array.
      console.log("hasUnReadMessages:", hasUnReadMessages);
      query.$expr = {
        $eq: [
          // The $last operator gets the last element from an array.
          // "$messages.readByAdmin" creates a temporary array of all readByAdmin values,
          // and $last gets the final one.
          { $last: "$messages.readByAdmin" },
          hasUnReadMessages,
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      FOREX_User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FOREX_User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: string) {
    return FOREX_User.findOne({ _id: id });
  },

  async approveLoginId(id: string) {
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        loginId_status: "approved",
        loginId_approvedAt: new Date(),
        loginId_rejectedAt: null,
        loginId_rejectionReason: null,
        mode: "default",
      },
      { new: true }
    );
  },

  async rejectLoginId(
    id: string,
    reason:
      | "deposit_missing"
      | "deposit_incomplete"
      | "duplicate_id"
      | "wrong_link"
      | "demo_account"
      | "other",
    customReason?: string
  ) {
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        loginId_status: "rejected",
        loginId_rejectedAt: new Date(),
        loginId_rejectionReason: reason,
        loginId_customRejectionReason: customReason,
        mode: "default",
      },
      { new: true }
    );
  },

  // --- Screenshot Approvals ---
  async approveAccountScreenshot(id: string) {
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        screenshotUrl_status: "approved",
        screenshotUrl_approvedAt: new Date(),
        screenshotUrl_rejectedAt: null,
        screenshotUrl_rejectionReason: null,
        mode: "default",
      },
      { new: true }
    );
  },

  async rejectAccountScreenshot(
    id: string,
    reason: "blurry_image" | "wrong_screenshot" | "other",
    customReason?: string
  ) {
    console.log({ objectid: id, reason: reason });
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        screenshotUrl_status: "rejected",
        screenshotUrl_rejectedAt: new Date(),
        screenshotUrl_rejectionReason: reason,
        screenshotUrl_customRejectionReason: customReason,
        mode: "default",
      },
      { new: true }
    );
  },

  // --- Test Trades Screenshot ---
  async approveTestTradesScreenshot(id: string) {
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        status: "approved",
        testTradesScreenshotUrl_status: "approved",
        testTradesScreenshotUrl_approvedAt: new Date(),
        testTradesScreenshotUrl_rejectedAt: null,
        testTradesScreenshotUrl_rejectionReason: null,
        mode: "default",
      },
      { new: true }
    );
  },

  async rejectTestTradesScreenshot(
    id: string,
    reason: "blurry_image" | "wrong_screenshot" | "other",
    customReason?: string
  ) {
    return FOREX_User.findOneAndUpdate(
      { _id: id },
      {
        testTradesScreenshotUrl_status: "rejected",
        testTradesScreenshotUrl_rejectedAt: new Date(),
        testTradesScreenshotUrl_rejectionReason: reason,
        testTradesScreenshotUrl_customRejectionReason: customReason,
        mode: "default",
      },
      { new: true }
    );
  },

  async deleteById(id: string) {
    return await FOREX_User.findOneAndDelete({ _id: id });
  },

  // Updated function to return only the messages array
  async findChatbyTelegramId(telegramId: string) {
    return await FOREX_User.findOne(
      { telegramId },
      { messages: 1 } // Select only the messages field
    );
  },



async approveUser(id: string, admin?: { name: string; email: string }) {
  const updateData: any = {
    status: "approved",

    // --- Login ID approval fields ---
    loginId_status: "approved",
    loginId_approvedAt: new Date(),
    loginId_rejectedAt: null,
    loginId_rejectionReason: null,

    // --- Account Screenshot approval fields ---
    screenshotUrl_status: "approved",
    screenshotUrl_approvedAt: new Date(),
    screenshotUrl_rejectedAt: null,
    screenshotUrl_rejectionReason: null,

    // --- Test Trades Screenshot approval fields ---
    testTradesScreenshotUrl_status: "approved",
    testTradesScreenshotUrl_approvedAt: new Date(),
    testTradesScreenshotUrl_rejectedAt: null,
    testTradesScreenshotUrl_rejectionReason: null,

    // --- Global approval fields ---
    approvedAt: new Date(),
    rejectedAt: null,
    mode: "default",
  };

  if (admin) {
    updateData.approvedBy = {
      name: admin.name,
      email: admin.email,
    };
  }

  const user = await FOREX_User.findOneAndUpdate(
    { _id: id },
    updateData,
    { new: true }
  );

  return user;
}



};
