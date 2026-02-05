import { Afibie10xUserStatsRepository } from "../data-access/afibie10x_users_stats.repository";

export const Afibie10xUserStatsService = {
  getStats: async () => {
    const [totalApprovedUsers, totalPendingUsers, totalRejectedUsers, totalUnreadMessages] =
      await Promise.all([
        Afibie10xUserStatsRepository.getTotalApprovedUsers(),
        Afibie10xUserStatsRepository.getTotalPendingUsers(),
        Afibie10xUserStatsRepository.getTotalRejectedUsers(),
        Afibie10xUserStatsRepository.getTotalUnreadMessages(),
      ]);

    return {
      totalApprovedUsers,
      totalPendingUsers,
      totalRejectedUsers,
      totalUnreadMessages,
    };
  },
};
