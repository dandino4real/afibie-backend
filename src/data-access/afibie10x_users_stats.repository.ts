import { Afibe10XUserModel } from "../models/afibe10x_user.model";


export const Afibie10xUserStatsRepository = {
  getTotalApprovedUsers: async () => {
    const totalApprovedUsers = await Afibe10XUserModel.countDocuments({
      status: "approved",
    });
    return totalApprovedUsers;
  },
  getTotalPendingUsers: async () => {
    const totalPendingUsers = await Afibe10XUserModel.countDocuments({
      status: "pending",
    });
    return totalPendingUsers;
  },
  getTotalRejectedUsers: async () => {
    const totalRejectedUsers = await Afibe10XUserModel.countDocuments({
      status: "rejected",
    });
    return totalRejectedUsers;
  },
  getTotalUnreadMessages: async () => {
    // Sum unreadCount across all users
    const result = await Afibe10XUserModel.aggregate([
      { $match: { hasUnread: true } }, // only users with unread messages
      { $group: { _id: null, totalUnread: { $sum: "$unreadCount" } } },
    ]);
    return result[0]?.totalUnread ?? 0;
  },

};
