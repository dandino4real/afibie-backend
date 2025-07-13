

// import { Request, Response } from "express";
// import { AuthService } from "../services/auth.service";

// export const AuthController = {
//   // login: async (req: Request, res: Response): Promise<any> => {
//   //   try {
//   //     const { email, password } = req.body;
//   //     if (!email || !password) {
//   //       return res.status(400).json({ message: "Email and password are required" });
//   //     }

//   //     const { id, accessToken, refreshToken } = await AuthService.login(email, password, req);

//   //     console.log("Setting refreshToken cookie:", {
//   //       refreshToken,
//   //       secure: process.env.NODE_ENV === "production",
//   //       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
//   //     });

//   //     // Determine domain based on environment
//   //     const isProduction = process.env.NODE_ENV === "production";
//   //     const cookieDomain = isProduction ? ".vercel.app" : undefined;

//   //     // Configure cookie options
//   //     const cookieOptions = {
//   //       httpOnly: true,
//   //       secure: isProduction,
//   //       sameSite: isProduction ? "none" as "none" : "lax" as "lax",
//   //       maxAge: 7 * 24 * 60 * 60 * 1000,
//   //       domain: cookieDomain
//   //     };

//   //     res.cookie("refreshToken", refreshToken, cookieOptions);


//   //     return res.status(200).json({
//   //       message: "Login successful",
//   //       accessToken,
//   //       id
//   //     });
//   //   } catch (error: any) {
//   //     return res.status(401).json({
//   //       message: error.message || "Authentication failed",
//   //     });
//   //   }
//   // },

//   // logout: async (req: Request, res: Response): Promise<any> => {
//   //   try {
//   //     const refreshToken = req.cookies?.refreshToken;
//   //     if (!refreshToken) return res.status(400).json({ message: "No token found" });

//   //     await AuthService.logout(refreshToken);

//   //     res.clearCookie("refreshToken", {
//   //       httpOnly: true,
//   //       secure: process.env.NODE_ENV === "production",
//   //       sameSite: "strict",
//   //     });

//   //     return res.status(200).json({ message: "Logged out successfully" });
//   //   } catch (error: any) {
//   //     return res.status(500).json({ message: error.message || "Logout failed" });
//   //   }
//   // },

//   login: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const { email, password } = req.body;
//       if (!email || !password) {
//         return res.status(400).json({ message: "Email and password are required" });
//       }

//       const { id, accessToken, refreshToken } = await AuthService.login(email, password, req);
//       console.log("Setting refreshToken cookie:", {
//         refreshToken,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//         domain: process.env.NODE_ENV === "production" ? "telegram-api-k5mk.vercel.app" : undefined,
//       });

//       res.cookie("refreshToken", refreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//         domain: process.env.NODE_ENV === "production" ? "telegram-api-k5mk.vercel.app" : undefined,
//       });

//       return res.status(200).json({
//         message: "Login successful",
//         accessToken,
//         id,
//       });
//     } catch (error: any) {
//       console.error("Login error:", error);
//       return res.status(401).json({
//         message: error.message || "Authentication failed",
//       });
//     }
//   },

//   logout: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const refreshToken = req.cookies?.refreshToken;
//       if (!refreshToken) return res.status(400).json({ message: "No token found" });

//       await AuthService.logout(refreshToken);

//       res.clearCookie("refreshToken", {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//         domain: process.env.NODE_ENV === "production" ? "telegram-api-k5mk.vercel.app" : undefined,
//       });

//       return res.status(200).json({ message: "Logged out successfully" });
//     } catch (error: any) {
//       return res.status(500).json({ message: error.message || "Logout failed" });
//     }
//   },

//   refresh: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const refreshToken = req.cookies?.refreshToken;

//       if (!refreshToken) {
//         return res.status(401).json({ message: "Missing refresh token" });
//       }

//       const accessToken = await AuthService.refreshAccessToken(refreshToken);

//       return res.status(200).json({ accessToken });
//     } catch (error: any) {
//       return res.status(401).json({ message: error.message || "Invalid refresh token" });
//     }
//   },

//   forgotPassword: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const { email } = req.body;
//       await AuthService.sendOTP(email);
//       res.json({ message: "OTP sent to email" });
//     } catch (error: any) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   verifyOtp: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const { email, otp } = req.body;
//       await AuthService.verifyOTP(email, otp);
//       res.json({ message: "OTP verified successfully" });
//     } catch (error: any) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   resetPassword: async (req: Request, res: Response): Promise<any> => {
//     try {
//       const { email, newPassword } = req.body;
//       if (!email || !newPassword) {
//         return res.status(400).json({ message: "Email and new password are required" });
//       }

//       const result = await AuthService.resetPassword(email, newPassword);
//       res.status(200).json(result);
//     } catch (error: any) {
//       res.status(400).json({ message: error.message });
//     }
//   },
// };

import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export const AuthController = {
  login: async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const { id, accessToken, refreshToken } = await AuthService.login(email, password, req);
      console.log("Returning refreshToken in response:", { id, accessToken, refreshToken });

      return res.status(200).json({
        message: "Login successful",
        accessToken,
        id,
        refreshToken, // Include refreshToken in response body
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(401).json({
        message: error.message || "Authentication failed",
      });
    }
  },

  logout: async (req: Request, res: Response): Promise<any> => {
    try {
      const { refreshToken } = req.body; // Expect refreshToken in request body
      if (!refreshToken) return res.status(400).json({ message: "No token provided" });

      await AuthService.logout(refreshToken);

      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Logout failed" });
    }
  },

  refresh: async (req: Request, res: Response): Promise<any> => {
    try {
      const { refreshToken } = req.body; // Expect refreshToken in request body
      if (!refreshToken) {
        return res.status(401).json({ message: "Missing refresh token" });
      }

      const accessToken = await AuthService.refreshAccessToken(refreshToken);

      return res.status(200).json({ accessToken });
    } catch (error: any) {
      return res.status(401).json({ message: error.message || "Invalid refresh token" });
    }
  },

  forgotPassword: async (req: Request, res: Response): Promise<any> => {
    try {
      const { email } = req.body;
      await AuthService.sendOTP(email);
      res.json({ message: "OTP sent to email" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  verifyOtp: async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, otp } = req.body;
      await AuthService.verifyOTP(email, otp);
      res.json({ message: "OTP verified successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }

      const result = await AuthService.resetPassword(email, newPassword);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },
};