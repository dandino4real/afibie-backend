import { FilterQuery } from "mongoose";
import { Afibe10XUserModel } from "../models/afibe10x_user.model";

export const Afibe10XUserRepository = {
  findAll: async (
    filter: FilterQuery<any>,
    page: number,
    limit: number,
    searchQuery?: string,
  ) => {
    const skip = (page - 1) * limit;

    let searchConditions = {};
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchConditions = {
        $or: [
          { username: regex },
          { fullName: regex },
          { userId: regex }, // WEEX UID
        ],
      };
    }

    const combinedFilter = {
      ...filter,
      ...searchConditions,
    };

    const users = await Afibe10XUserModel.aggregate([
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

    const total = await Afibe10XUserModel.countDocuments(combinedFilter);

    return { users, total };
  },

  findById: async (id: string) => {
    return Afibe10XUserModel.findById(id);
  },

  approveUser: async (id: string, name: string, email: string) => {
    return Afibe10XUserModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: { name, email },
        $unset: { rejectedAt: "", rejectedBy: "", rejectionReason: "" },
      },
      { new: true },
    );
  },

  rejectUser: async (
    id: string,
    name: string,
    email: string,
    rejectionReason: "no_deposit" | "wrong_link",
  ) => {
    return Afibe10XUserModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: { name, email },
        rejectionReason,
        $unset: { approvedAt: "", approvedBy: "" },
      },
      { new: true },
    );
  },

  deleteById: async (id: string) => {
    return Afibe10XUserModel.findByIdAndDelete(id);
  },
  markMessagesAsSeen: async (id: string) => {
    return Afibe10XUserModel.findOneAndUpdate(
      {
        _id: id,
        hasUnread: true,
      },
      {
        $set: {
          unreadCount: 0,
          hasUnread: false,
          "messages.$[msg].readByAdmin": true,
        },
      },
      {
        arrayFilters: [{ "msg.sender": "user", "msg.readByAdmin": false }],
        new: true,
      },
    );
  },
};
