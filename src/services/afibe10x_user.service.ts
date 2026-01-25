import { Afibe10XUserRepository } from "../data-access/afibe10x_user.repository";

export const Afibe10XUserService = {
    fetchUsers: async (query: any) => {
        const {
            page = 1,
            limit = 10,
            status,
            dateFrom,
            dateTo,
            search,
        } = query;

        const filter: any = {};

        if (status) filter.status = status;

        if (dateFrom && dateTo) {
            filter.createdAt = {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo),
            };
        }

        const { users, total } = await Afibe10XUserRepository.findAll(
            filter,
            parseInt(page),
            parseInt(limit),
            search
        );

        return {
            users,
            pagination: {
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
        const updated = await Afibe10XUserRepository.approveUser(
            userId,
            admin.name,
            admin.email
        );
        if (!updated) throw new Error("User already processed or not found");
        return updated;
    },

    rejectUser: async (
        userId: string,
        admin: { name: string; email: string },
        rejectionReason: 'no_deposit' | 'wrong_link'
    ) => {
        if (!['no_deposit', 'wrong_link'].includes(rejectionReason)) {
            throw new Error("Invalid rejection reason");
        }
        const updated = await Afibe10XUserRepository.rejectUser(
            userId,
            admin.name,
            admin.email,
            rejectionReason
        );
        if (!updated) throw new Error("User already processed or not found");
        return updated;
    },

    deleteUserById: async (id: string) => {
        const user = await Afibe10XUserRepository.deleteById(id);
        if (!user) {
            throw new Error("User not found or already deleted");
        }
        return user;
    },
};
