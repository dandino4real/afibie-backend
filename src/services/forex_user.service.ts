// src/services/forexUser.service.ts
import { ForexUserRepository } from "../data-access/forex_user.repository";

export const ForexUserService = {
  getForexUsers: async (query: any) => {
    const {
      search = "",
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const filters: any = { botType: "forex" };

    if (status) filters.status = status;

    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { excoTraderLoginId: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return await ForexUserRepository.findAllWithFilters(filters, pageNum, limitNum);
  },
  approveUser: async (
      userId: string,
      admin: { name: string; email: string }
    ) => {
      const updated = await ForexUserRepository.approveUser(
        userId,
        admin.name,
        admin.email
      );
      if (!updated) throw new Error("User already processed or not found");
      return updated;
    },
  
   rejectUser: async (
    userId: string,
    admin: { name: string; email: string },
    rejectionReason: 'no_affiliate_link' | 'insufficient_deposit'
  ) => {
    if (!['no_affiliate_link', 'insufficient_deposit'].includes(rejectionReason)) {
      throw new Error("Invalid rejection reason");
    }
    const updated = await ForexUserRepository.rejectUser(
      userId,
      admin.name,
      admin.email,
      rejectionReason
    );
    if (!updated) throw new Error("User already processed or not found");
    return updated;
  },
  
    deleteUserById: async (id: string) => {
      const user = await ForexUserRepository.deleteById(id);
      if (!user) {
        throw new Error("User not found or already deleted");
      }
      return user;
    },
};
