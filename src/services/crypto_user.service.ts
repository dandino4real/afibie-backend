import { CryptoUserRepository } from "../data-access/crypto_user.repository";

export const CryptoUserService = {
  fetchUsers: async (query: any) => {
    const {
      page = 1,
      limit = 10,
      status,
      platform,
      country,
      dateFrom,
      dateTo,
      search,
    } = query;

    const filter: any = {};

    if (status) filter.status = status;
    if (platform) filter.registeredVia = platform;
    if (country) filter.country = country;

    if (dateFrom && dateTo) {
      filter.createdAt = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo),
      };
    }

    const { users, total } = await CryptoUserRepository.findAll(
      filter,
      parseInt(page),
      parseInt(limit),
      search
    );

    return {
      users,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
  
  approveUser: async (
    userId: string,
    admin: { name: string; email: string }
  ) => {
  

    const updated = await CryptoUserRepository.approveUser(
      userId,
      admin.name,
      admin.email
    );
    if (!updated) throw new Error("User already processed or not found");
    return updated;
  },

  // rejectUser: async (
  //   userId: string,
  //   admin: { name: string; email: string }
  // ) => {
  //   const updated = await CryptoUserRepository.rejectUser(
  //     userId,
  //     admin.name,
  //     admin.email
  //   );
  //   if (!updated) throw new Error("User already processed or not found");
  //   return updated;
  // },
rejectUser: async (
    userId: string,
    admin: { name: string; email: string },
    rejectionReason: 'no_affiliate_link' | 'no_kyc'
  ) => {
    if (!['no_affiliate_link', 'no_kyc'].includes(rejectionReason)) {
      throw new Error("Invalid rejection reason");
    }
    const updated = await CryptoUserRepository.rejectUser(
      userId,
      admin.name,
      admin.email,
      rejectionReason
    );
    if (!updated) throw new Error("User already processed or not found");
    return updated;
  },

  deleteUserById: async (id: string) => {
    const user = await CryptoUserRepository.deleteById(id);
    if (!user) {
      throw new Error("User not found or already deleted");
    }
    return user;
  },
};
