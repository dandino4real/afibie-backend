import { Request, Response, NextFunction } from "express";
import { AdminModel, AdminType } from "../models/admin.model";
import { verifyAccessToken } from "../utils/jwt";


export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });
    const decoded = verifyAccessToken(token)

    const admin = await AdminModel.findById(decoded.id);
  
    if (!admin || admin.status !== "active") {
      return res.status(403).json({ message: "Forbidden: Admin inactive or not found" });
    }

    // Attach admin to request
    (req as any).admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorizePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const admin = (req as any).admin as AdminType;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (admin.role === "superadmin" || admin.permissions.includes(permission)) {
      return next(); 
    }

    res.status(403).json({ message: "Forbidden: Missing permission" });
  };
};

