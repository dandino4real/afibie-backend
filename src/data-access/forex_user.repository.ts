// src/data-access/forexUser.repository.ts
import { ForexUserModel } from "../models/forex_user.model";
import { PipelineStage } from "mongoose";

export const ForexUserRepository = {
  findAllWithFilters: async (filters: any, page: number, limit: number) => {
    const skip = (page - 1) * limit;

     const aggregationPipeline: PipelineStage[] = [
      { $match: filters },
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 0 },
                { case: { $eq: ["$status", "approved"] }, then: 1 },
                { case: { $eq: ["$status", "rejected"] }, then: 2 },
              ],
              default: 3,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [users, total] = await Promise.all([
      ForexUserModel.aggregate(aggregationPipeline),
      ForexUserModel.countDocuments(filters),
    ]);

    return { users, total };
  },
  findById: async (id: string) => {
    return ForexUserModel.findById(id);
  },

  approveUser: async (id: string, name: string, email: string) => {
    return ForexUserModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "approved",
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: { name, email },
        $unset: { rejectedAt: "", rejectedBy: "" },
      },
      { new: true }
    );
  },

  rejectUser: async (
    id: string,
    name: string,
    email: string,
    rejectionReason: "no_affiliate_link" | "insufficient_deposit"
  ) => {
    return ForexUserModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "rejected",
        isApproved: false,
        rejectedAt: new Date(),
        rejectedBy: { name, email },
        rejectionReason,
        $unset: { approvedAt: "", approvedBy: "" },
      },
      { new: true }
    );
  },

  deleteById: async (id: string) => {
    return ForexUserModel.findByIdAndDelete(id);
  },
};
