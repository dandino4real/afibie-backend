import { Request, Response, NextFunction } from "express";

export const authorizeSuperadmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const admin = (req as any).admin;

  if (!admin || admin.role !== "superadmin") {
    res.status(403).json({ message: "Access denied. Superadmin only." });
    return;
  }

  return next(); 
};
