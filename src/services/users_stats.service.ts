import { UserStatsRepository } from "../data-access/users_stats.repository";

export const UserStatsService = {
  getStats: async () => {
    const [
      totalApprovedUsers,
      totalPendingUsers,
      monthlyNewUsers,
      cryptoApproved,
      forexApproved,
      monthlyBreakdown,
    ] = await Promise.all([
      UserStatsRepository.getTotalApprovedUsers(),
      UserStatsRepository.getTotalPendingUsers(),
      UserStatsRepository.getMonthlyNewUsers(),
      UserStatsRepository.getCryptoApprovedUsers(),
      UserStatsRepository.getForexApprovedUsers(),
      UserStatsRepository.getLastSixMonthsStats(),
    ]);

    return {
      totalApprovedUsers,
      totalPendingUsers,
      monthlyNewUsers,
      cryptoApproved,
      forexApproved,
      monthlyBreakdown,
    };
  },
};
