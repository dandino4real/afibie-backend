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
};
