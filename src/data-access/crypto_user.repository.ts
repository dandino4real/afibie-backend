import { FilterQuery } from "mongoose";
import { CryptoUserModel } from "../models/crypto_user.model";

export const CryptoUserRepository = {
  findAll: async (
    filter: FilterQuery<any>,
    page: number,
    limit: number,
    searchQuery?: string
  ) => {
    const skip = (page - 1) * limit;

    let searchConditions = {};
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchConditions = {
        $or: [
          { username: regex },
          { fullName: regex },
          { country: regex },
          { registeredVia: regex },
          { bybitUid: regex },
          { blofinUid: regex },
          { weexUid: regex },
        ],
      };
    }

    const combinedFilter = {
      ...filter,
      ...searchConditions,
    };

    const users = await CryptoUserModel.aggregate([
      { $match: combinedFilter },
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
    ]);

    const total = await CryptoUserModel.countDocuments(combinedFilter);

    return { users, total };
  },

  findById: async (id: string) => {
    return CryptoUserModel.findById(id);
  },

  approveUser: async (id: string, name: string, email: string) => {
    return CryptoUserModel.findOneAndUpdate(
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

  // rejectUser: async (id: string, name: string, email: string) => {
  //   return CryptoUserModel.findOneAndUpdate(
  //     { _id: id, status: "pending" },
  //     {
  //       status: "rejected",
  //       isApproved: false,
  //       rejectedAt: new Date(),
  //       rejectedBy: { name, email },
  //       $unset: { approvedAt: "", approvedBy: "" },
  //     },
  //     { new: true }
  //   );
  // },
  rejectUser: async (
    id: string,
    name: string,
    email: string,
    rejectionReason: "no_affiliate_link" | "no_kyc"
  ) => {
    return CryptoUserModel.findOneAndUpdate(
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
    return CryptoUserModel.findByIdAndDelete(id);
  },
};
