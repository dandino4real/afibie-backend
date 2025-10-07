import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

export const AdminController = {
  createAdmin: async (req: Request, res: Response) : Promise<any> => {
    try {
      const { name, email, permissions } = req.body;

      if (!name || !email )
        return res
          .status(400)
          .json({ message: "Name, email, and password are required" });

      const admin = await AdminService.createAdmin({
        name,
        email,
        permissions,
      });

      return res.status(201).json({ message: "Admin created", admin });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },

  editAdmin: async (req: Request, res: Response) : Promise<any> => {
    try {
      const { id } = req.params;
      const { name, email, status, permissions } = req.body;

      const updatedAdmin = await AdminService.editAdmin(id, { name, email, status, permissions });
      if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

      return res.status(200).json({ message: "Admin updated", admin: updatedAdmin });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },

  deleteAdmin: async (req: Request, res: Response)  : Promise<any> => {
    try {
      const { id } = req.params;
      const requestingAdmin = (req as any).admin;

      if (requestingAdmin.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmin can perform this action" });
      }

      const deletedAdmin = await AdminService.deleteAdmin(id);
      if (!deletedAdmin) return res.status(404).json({ message: "Admin not found" });

      return res.status(200).json({ message: "Admin deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
  fetchAdmins: async (req: Request, res: Response)  : Promise<any> => {
    try {
      const filters = req.query;
      const requestingAdmin = (req as any).admin;
      if (requestingAdmin.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmin can perform this action" });
      }

      const admins = await AdminService.fetchAdmins(filters);
      return res.status(200).json({ admins });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
   getAdminStats: async (req: Request, res: Response) : Promise<any>  => {
    try {
      const stats = await AdminService.getAdminStats();
      return res.status(200).json({ stats });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
  getAdminById: async (req: Request, res: Response) : Promise<any>  => {
    try {
      const { id } = req.params;
      const admin = await AdminService.getAdminById(id);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      return res.status(200).json({ admin });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
   getProfile: async (req: Request, res: Response) : Promise<any>  => {
    console.log('got here admin controller')
    try {
      const adminId = (req as any).admin?.id;
      console.log('adminId', adminId)
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });

      const profile = await AdminService.getAdminProfile(adminId);
      console.log({profile})
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      return res.status(200).json({ profile });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
  // updateProfile: async (req: Request, res: Response): Promise<any> => {
  //   const admin = (req as any).admin; // from auth middleware
  //   const { id } = req.params;
  //   const isSuperAdmin = admin?.role === "superadmin";

  //   // Only allow self-update or superadmin access
  //   if (!isSuperAdmin && id !== admin.id) {
  //     return res.status(403).json({ message: "Forbidden" });
  //   }

  //   const updated = await AdminService.updateAdminProfile(id, req.body, isSuperAdmin);
  //   return res.json({ message: "Admin updated", admin: updated });
  // }

  updateProfile: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const admin = (req as any).admin; // From auth middleware
      const isSuperAdmin = admin?.role === 'superadmin';

      // Only allow self-update or superadmin access
      if (!isSuperAdmin && id !== admin.id) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
      }

      const result = await AdminService.updateAdminProfile(id, req.body, isSuperAdmin);

      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      if (!result.admin) {
        return res.status(500).json({ message: 'Failed to update profile: No admin data returned' });
      }

      return res.status(200).json({ message: 'Admin updated successfully', admin: result.admin });
    } catch (error: any) {
      console.error('AuthController: updateProfile failed:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  },
  
};
