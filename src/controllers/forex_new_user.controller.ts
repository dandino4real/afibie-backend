import { Request, Response } from "express";
import { ForexUserService } from "../services/forex_new_user.service";

export const ForexUserController = {
  async getAllForexUsers(req: Request, res: Response): Promise<any> {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        country,
        broker,
        loginId_status,
        screenshotUrl_status,
        testTradesScreenshotUrl_status,
      } = req.query;

      const result = await ForexUserService.getAllForexUsers({
        page: Number(page),
        limit: Number(limit),
        search: String(search),
        country: country ? String(country) : undefined,
        broker: broker ? String(broker) : undefined,
        loginId_status: loginId_status ? String(loginId_status) : undefined,
        screenshotUrl_status: screenshotUrl_status
          ? String(screenshotUrl_status)
          : undefined,
        testTradesScreenshotUrl_status: testTradesScreenshotUrl_status
          ? String(testTradesScreenshotUrl_status)
          : undefined,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error("❌ Get All Forex Users Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async approveLoginId(req: Request, res: Response): Promise<any> {
    try {
      console.log("got here controller approve");
      const { id } = req.params;
      console.log({ id: id });
      const user = await ForexUserService.approveLoginId(id);
      res.status(200).json({ message: "Login ID approved", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async rejectLoginId(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { reason, customReason } = req.body;
      const user = await ForexUserService.rejectLoginId(
        id,
        reason,
        customReason
      );
      res.status(200).json({ message: "Login ID rejected", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // --- Account Screenshot Approval ---
  async approveAccountScreenshot(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const user = await ForexUserService.approveAccountScreenshot(id);
      res.status(200).json({ message: "Account screenshot approved", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async rejectAccountScreenshot(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { reason, customReason } = req.body;
      const user = await ForexUserService.rejectAccountScreenshot(id, reason, customReason);
      res.status(200).json({ message: "Account screenshot rejected", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // --- Test Trades Screenshot Approval ---
  async approveTestTradesScreenshot(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const user = await ForexUserService.approveTestTradesScreenshot(id);
      res
        .status(200)
        .json({ message: "Test trades screenshot approved", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async rejectTestTradesScreenshot(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { reason, customReason } = req.body;
      const user = await ForexUserService.rejectTestTradesScreenshot(
        id,
        reason,
        customReason
      );
      res
        .status(200)
        .json({ message: "Test trades screenshot rejected", user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async deleteForexUser(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const deletedUser = await ForexUserService.deleteForexUser(id);

      if (!deletedUser)
        return res.status(404).json({ message: "User not found" });

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("❌ Delete Forex User Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async getChatMessagesByTelegramId(req: Request, res: Response): Promise<any> {
    try {
      const { telegramId } = req.params;
      const user = await ForexUserService.getChatMessagesByTelegramId(telegramId);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.status(200).json({ messages: user.messages || [] });
    } catch (error: any) {
      console.error("❌ Get Chat Messages Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};
