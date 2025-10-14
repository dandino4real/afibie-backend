import { ForexUserDAL } from "../data-access/forex_new_user.repository";

export const ForexUserService = {

 async getAllForexUsers(filters: {
    page: number;
    limit: number;
    search?: string;
    country?: string;
    broker?: string;
    loginId_status?: string;
    screenshotUrl_status?: string;
    testTradesScreenshotUrl_status?: string;
    hasUnreadMessages?: boolean;
  }) {
    return await ForexUserDAL.findAll(filters);
  },

  async approveLoginId(id: string) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.loginId_status === "approved")
      throw new Error("Login ID already approved");

    return ForexUserDAL.approveLoginId(id);
  },

  async rejectLoginId(
    id: string,
    reason: "deposit_missing" | "deposit_incomplete" | "duplicate_id" | "wrong_link" | "demo_account" | "other",
    customReason?: string
  ) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.loginId_status === "rejected")
      throw new Error("Login ID already rejected");

    if (!reason && !customReason)
      throw new Error("You must provide a rejection reason.");

    return ForexUserDAL.rejectLoginId(id, reason, customReason); 
  },

  async approveAccountScreenshot(id: string) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.screenshotUrl_status === "approved")
      throw new Error("Screenshot already approved");

    return ForexUserDAL.approveAccountScreenshot(id);
  },

  async rejectAccountScreenshot(
    id: string,
    reason: "blurry_image" | "wrong_screenshot" | "other",
    customReason?: string
  ) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.screenshotUrl_status === "rejected")
      throw new Error("Screenshot already rejected");

    return ForexUserDAL.rejectAccountScreenshot(id, reason, customReason);
  },

  async approveTestTradesScreenshot(id: string) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.testTradesScreenshotUrl_status === "approved")
      throw new Error("Test trades screenshot already approved");

    return ForexUserDAL.approveTestTradesScreenshot(id);
  },

  async rejectTestTradesScreenshot(
    id: string,
    reason: "blurry_image" | "wrong_screenshot" | "other",
    customReason?: string
  ) {
    const user = await ForexUserDAL.findById(id);
    if (!user) throw new Error("User not found");

    if (user.testTradesScreenshotUrl_status === "rejected")
      throw new Error("Test trades screenshot already rejected");

    return ForexUserDAL.rejectTestTradesScreenshot(id, reason, customReason);
  },

  async deleteForexUser(id: string) {
    return await ForexUserDAL.deleteById(id);
  },

  async getChatMessagesByTelegramId(telegramId: string) {
    return await ForexUserDAL.findChatbyTelegramId(telegramId);
  }

};
