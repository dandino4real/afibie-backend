import { AdminModel } from "../models/admin.model";
import type { AdminType } from "../models/admin.model";
import { Types } from "mongoose";

export const AdminRepository = {
  findByEmail: async (email: string) => {
    return AdminModel.findOne({ email });
  },
  createAdmin: async (data: {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "admin_crypto" | "admin_forex" | "superadmin";
    permissions?: string[];
  }) => {
    const existing = await AdminModel.findOne({ email: data.email });
    if (existing) throw new Error("AdminModel with this email already exists");

    const admin = new AdminModel({
      ...data,
      role: data.role || "admin",
      permissions: data.permissions || [],
      status: "inactive",
    });

    return await admin.save();
  },
  editAdmin: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      status?: "active" | "inactive" | "suspended";
      password?: string;
      permissions?: string[];
      role?: "admin" | "admin_crypto" | "admin_forex" | "superadmin";
    }
  ) => {
    return await AdminModel.findByIdAndUpdate(id, data, { new: true });
  },
  deleteAdmin: async (id: string) => {
    return await AdminModel.findByIdAndDelete(id);
  },

  findById: async (id: string) => {
    return await AdminModel.findById(id).select("-password");
  },
  updateRefreshToken: async (adminId: string, token: string | null) => {
    return await AdminModel.findByIdAndUpdate(
      adminId,
      { refreshToken: token },
      { new: true }
    );
  },

  findByRefreshToken: async (token: string) => {
    return await AdminModel.findOne({ refreshToken: token });
  },

  fetchAdmins: async (filters: any) => {
    const query: any = {
      role: { $ne: "superadmin" }, // ✅ Exclude superadmin
    };

    if (filters.status) query.status = filters.status;

    if (filters.permissions) {
      query.permissions = { $in: [filters.permissions] };
    }

    if (filters.created) {
      const now = new Date();
      let start: Date | undefined = undefined;

      switch (filters.created) {
        case "today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "this_week":
          const day = now.getDay();
          start = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - day
          );
          break;
        case "this_month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (start !== undefined) {
        query.createdAt = { $gte: start };
      }
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      AdminModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminModel.countDocuments(query),
    ]);

    return {
      admins,
      total,
      page,
      limit,
    };
  },

  // getAdminStats: async () => {
  //   const totalAdmins = await AdminModel.countDocuments({ role: "admin" });
  //   const activeAdmins = await AdminModel.countDocuments({
  //     role: "admin",
  //     status: "active",
  //   });
  //   const inactiveAdmins = await AdminModel.countDocuments({
  //     role: "admin",
  //     status: "inactive",
  //   });
  //   const suspendedAdmins = await AdminModel.countDocuments({
  //     role: "admin",
  //     status: "suspended",
  //   });

  //   return {
  //     totalAdmins,
  //     activeAdmins,
  //     inactiveAdmins,
  //     suspendedAdmins,
  //   };
  // },

  getAdminStats: async () => {
    // Count all admins except superadmin
    const totalAdmins = await AdminModel.countDocuments({
      role: { $ne: "superadmin" },
    });

    const activeAdmins = await AdminModel.countDocuments({
      role: { $ne: "superadmin" },
      status: "active",
    });

    const inactiveAdmins = await AdminModel.countDocuments({
      role: { $ne: "superadmin" },
      status: "inactive",
    });

    const suspendedAdmins = await AdminModel.countDocuments({
      role: { $ne: "superadmin" },
      status: "suspended",
    });

    // Optional — count by specific roles
    const adminCount = await AdminModel.countDocuments({ role: "admin" });
    const cryptoCount = await AdminModel.countDocuments({
      role: "admin_crypto",
    });
    const forexCount = await AdminModel.countDocuments({ role: "admin_forex" });
    const superadminCount = await AdminModel.countDocuments({
      role: "superadmin",
    });

    return {
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      suspendedAdmins,
      byRole: {
        admin: adminCount,
        admin_crypto: cryptoCount,
        admin_forex: forexCount,
        superadmin: superadminCount,
      },
    };
  },

  getProfileById: async (id: string) => {
    return await AdminModel.findById(id);
  },
  // admin.repository.ts
  updateLastLoginInfo: async (
    id: string | Types.ObjectId,
    update: Partial<AdminType>
  ) => {
    return AdminModel.findByIdAndUpdate(id, update, { new: true });
  },
  updateAdminById: async (id: string, update: Partial<any>) => {
    return AdminModel.findByIdAndUpdate(id, update, { new: true });
  },
  saveAdmin: (admin: any) => admin.save(),

  findByEmailAndOTP: (email: string, otp: string) =>
    AdminModel.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() },
    }),
};
