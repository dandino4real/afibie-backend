import { AdminRepository } from "../data-access/admin.repository";
import { sendNewAdminEmail } from "../emails/sendNewAdminEmail";
import { AdminType } from "../models/admin.model";
import { generateSecurePassword } from "../utils/generatePassword";
import { comparePassword, hashPassword } from "../utils/hash";

interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  oldPassword?: string;
  newPassword?: string;
}

interface UpdateAdminProfileResult {
  admin: AdminType | null;
  error?: string;
}

export const AdminService = {
  createAdmin: async (data: {
    name: string;
    email: string;
    permissions?: string[];
  }) => {
    const generatedPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const newAdmin = await AdminRepository.createAdmin({
      ...data,
      password: hashedPassword,
      role: "admin", // ✅ ensure role is set
    });

    await sendNewAdminEmail(data.email, data.name, generatedPassword); // ✅ send plain password

    return newAdmin;
  },

  editAdmin: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      status?: "active" | "inactive" | "suspended";
      permissions?: string[];
    }
  ) => {
    return await AdminRepository.editAdmin(id, data);
  },
  deleteAdmin: async (id: string) => {
    return await AdminRepository.deleteAdmin(id);
  },

  getAdminById: async (id: string) => {
    return await AdminRepository.findById(id);
  },

  fetchAdmins: async (filters: any) => {
    return await AdminRepository.fetchAdmins(filters);
  },
  getAdminStats: async () => {
    return await AdminRepository.getAdminStats();
  },
  getAdminProfile: async (id: string) => {
    return await AdminRepository.getProfileById(id);
  },

  updateAdminProfile: async (
    id: string,
    data: UpdateProfileData,
    isSuperAdmin: boolean
  ): Promise<UpdateAdminProfileResult> => {
    try {
      // Fetch the admin by ID
      const admin = await AdminRepository.getProfileById(id);
      if (!admin) {
        return { admin: null, error: "Admin not found" };
      }

      // Convert Mongoose document to plain object for type consistency
      const adminPlain = admin.toObject ? admin.toObject() : admin;

      // Initialize update data object
      const updateData: Partial<AdminType> = {};

      // Allow name and email updates only for superadmins
      if (isSuperAdmin) {
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;
      }

      // Allow phone update for all roles
      if (data.phone) updateData.phone = data.phone;

      // Handle password update if provided
      if (data.oldPassword && data.newPassword) {
        const isMatch = await comparePassword(
          data.oldPassword,
          adminPlain.password
        );
        if (!isMatch) {
          return { admin: null, error: "Invalid current password" };
        }
        updateData.password = await hashPassword(data.newPassword);
      }

      // Skip update if no fields are provided
      if (Object.keys(updateData).length === 0) {
        return {
          admin: adminPlain as unknown as AdminType,
          error: "No valid fields provided for update",
        };
      }

      // Perform the update
      const updatedAdmin = await AdminRepository.updateAdminById(
        id,
        updateData
      );
      // Convert Mongoose document to plain object
      const updatedAdminPlain: AdminType | null = updatedAdmin
        ? updatedAdmin.toObject
          ? (updatedAdmin.toObject() as unknown as AdminType)
          : (updatedAdmin as AdminType)
        : null;

      return { admin: updatedAdminPlain, error: undefined };
    } catch (error: any) {
      console.error("updateAdminProfile: Failed to update admin:", error);
      return {
        admin: null,
        error: error.message || "Failed to update profile",
      };
    }
  },
};
