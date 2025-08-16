import { Request, Response } from "express";
import { CryptoUserService } from "../services/crypto_user.service";

export const CryptoUserController = {
  getUsers: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await CryptoUserService.fetchUsers(req.query);
      return res.json(data);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch crypto users" });
    }
  },

  approveCryptoUser: async (req: Request, res: Response) : Promise<any> => {
    try {
      const { id } = req.params;
      const admin = (req as any).admin;

      const result = await CryptoUserService.approveUser(id, {
        name: admin.name,
        email: admin.email,
      });
      res.status(200).json({ message: "User approved", data: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  // rejectCryptoUser: async (req: Request, res: Response): Promise<any> => {
  //   try {
  //     const { id } = req.params;
  //     const admin = (req as any).admin;
  //     const result = await CryptoUserService.rejectUser(id, {
  //       name: admin.name,
  //       email: admin.email,
  //     });
  //     res.status(200).json({ message: "User rejected", data: result });
  //   } catch (err: any) {
  //     res.status(400).json({ message: err.message });
  //   }
  // },

  rejectCryptoUser : async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    if (!["no_affiliate_link", "no_kyc"].includes(rejectionReason)) {
      return res.status(400).json({ message: "Invalid rejection reason" });
    }

    const result = await CryptoUserService.rejectUser(id, {
      name: admin.name,
      email: admin.email,
    }, rejectionReason);

    res.status(200).json({ message: "User rejected", data: result });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
},

   deleteUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const deleted = await CryptoUserService.deleteUserById(id);
      return res.status(200).json({
        message: "User deleted successfully",
        user: deleted,
      });
    } catch (err: any) {
      return res.status(400).json({
        message: err.message || "Failed to delete user",
      });
    }
  },
};
