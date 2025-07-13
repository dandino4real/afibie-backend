import { CryptoUserModel } from "../models/crypto_user.model";
import { ForexUserModel } from "../models/forex_user.model";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const UserStatsRepository = {
  getTotalApprovedUsers: async () => {
    const [crypto, forex] = await Promise.all([
      CryptoUserModel.countDocuments({ status: "approved" }),
      ForexUserModel.countDocuments({ status: "approved" }),
    ]);
    return crypto + forex;
  },

  getTotalPendingUsers: async () => {
    const [crypto, forex] = await Promise.all([
      CryptoUserModel.countDocuments({ status: "pending" }),
      ForexUserModel.countDocuments({ status: "pending" }),
    ]);
    return crypto + forex;
  },

  getMonthlyNewUsers: async () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    const [crypto, forex] = await Promise.all([
     CryptoUserModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ForexUserModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);
    return crypto + forex;
  },

  getCryptoApprovedUsers: async () => {
    return CryptoUserModel.countDocuments({ status: "approved" });
  },

  getForexApprovedUsers: async () => {
    return ForexUserModel.countDocuments({ status: "approved" });
  },

  getLastSixMonthsStats: async () => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(now, 5 - i);
      return {
        label: date.toLocaleString("default", { month: "short" }),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });

    const cryptoStats = await Promise.all(
      months.map(m =>
        CryptoUserModel.countDocuments({ createdAt: { $gte: m.start, $lte: m.end } })
      )
    );

    const forexStats = await Promise.all(
      months.map(m =>
        ForexUserModel.countDocuments({ createdAt: { $gte: m.start, $lte: m.end } })
      )
    );

    return months.map((m, i) => ({
      month: m.label,
      crypto: cryptoStats[i],
      forex: forexStats[i],
    }));
  },
};
