import { Afibie10xUserStatsRepository } from "../data-access/afibie10x_users_stats.repository";

export const Afibie10xUserStatsService = {
  getStats: async () => {
    const [totalApprovedUsers, totalPendingUsers, totalRejectedUsers] =
      await Promise.all([
        Afibie10xUserStatsRepository.getTotalApprovedUsers(),
        Afibie10xUserStatsRepository.getTotalPendingUsers(),
        Afibie10xUserStatsRepository.getTotalRejectedUsers(),
      ]);

    return {
      totalApprovedUsers,
      totalPendingUsers,
      totalRejectedUsers,
    };
  },
};
