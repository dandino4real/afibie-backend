
import { comparePassword, hashPassword } from "../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AdminRepository } from "../data-access/admin.repository";
import geoip from "geoip-lite";
import { sendNewLocationAlert } from "../emails/sendNewIpAlert";
import { sendLoginNotification } from "../emails/sendLoginNotification";
import crypto from "crypto";
import { sendOTPEmail } from "../emails/sendOtpNotification";

export const AuthService = {
  login: async (email: string, password: string, req: any) => {
    const admin = await AdminRepository.findByEmail(email);

    if (!admin) throw new Error("Invalid email or password");

    const isMatch = await comparePassword(password, admin.password);

    if (!isMatch) throw new Error("Invalid email or password");

    const payload = { id: admin._id, email: admin.email };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    if (admin.role === 'admin' && admin.status === 'inactive') {
      await AdminRepository.editAdmin(admin._id.toString(), { status: 'active' });
      admin.status = 'active';
    }

    let currentIP =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip;

    const geo = geoip.lookup(currentIP);
    const currentLocation = geo
      ? `${geo.city}, ${geo.region}, ${geo.country}`
      : "Unknown";
    currentIP = currentIP || "127.0.0.1"; 
    const isNewIP = currentIP !== admin.lastIp;

    await AdminRepository.updateLastLoginInfo(admin._id, {
      lastIp: currentIP,
      lastLogin: new Date(),
    });

    await AdminRepository.updateRefreshToken(admin._id.toString(), refreshToken);

    const response = {
      id: admin._id,
      accessToken,
      refreshToken,
    };

    const sendWithRetry = async (task: () => Promise<void>, maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Delay between retries
          await task();
          break; // Success, exit loop
        } catch (error) {
          console.error(`Email attempt ${attempt + 1} failed:`, error);
          if (attempt === maxRetries - 1) {
            console.error("Max retries reached, giving up on email:", error);
          }
        }
      }
    };

    if (isNewIP) {
      const previousGeo = geoip.lookup(admin.lastIp || "");
      const previousLocation = previousGeo
        ? `${previousGeo.city}, ${previousGeo.region}, ${previousGeo.country}`
        : "Unknown";
      setTimeout(() =>
        sendWithRetry(() =>
          sendNewLocationAlert(admin.email, admin.name, previousLocation, currentLocation, currentIP)
        ), 0);
    }
    setTimeout(() =>
      sendWithRetry(() =>
        sendLoginNotification(admin.email, admin.name, currentLocation, currentIP)
      ), 0);

    return response;
  },

  refreshAccessToken: async (refreshToken: string) => {
    const decoded = verifyRefreshToken(refreshToken) as { id: string; email: string };
    const admin = await AdminRepository.findById(decoded.id);
    if (!admin) throw new Error("Admin not found");
    if (admin.status !== "active") throw new Error("Admin account is not active");
    const payload = { id: admin._id, email: admin.email };
    const newAccessToken = generateAccessToken(payload);
    return newAccessToken;
  },
  logout: async (refreshToken: string) => {
    const admin = await AdminRepository.findByRefreshToken(refreshToken);
    if (!admin) throw new Error("Invalid refresh token");
    await AdminRepository.updateRefreshToken(admin._id.toString(), null);
    return true;
  },
  sendOTP: async (email: string) => {
    const admin = await AdminRepository.findByEmail(email);
    if (!admin) throw new Error("Email not found");

    const otp = crypto.randomInt(100000, 999999).toString();
    admin.resetPasswordOTP = otp;
    admin.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await AdminRepository.saveAdmin(admin);

    const sendWithRetry = async (task: () => Promise<void>, maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {

        try {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // 0s, 1s, 2s delays
          await task();
          console.log(`OTP email sent successfully to ${email} on attempt ${attempt + 1} at ${new Date().toISOString()}`);
          break;
        } catch (error) {
          console.error(`OTP email attempt ${attempt + 1} failed for ${email}:`, error);
          if (attempt === maxRetries - 1) {
            console.error(`Max retries reached for OTP email to ${email}:`, error);
          }
        }
      }
    };

    setTimeout(() => sendWithRetry(async () => { await sendOTPEmail(admin.email, admin.name, otp); }), 0);
  },

  verifyOTP: async (email: string, otp: string) => {
    const adminDoc = await AdminRepository.findByEmailAndOTP(email, otp);
    if (!adminDoc) throw new Error('Invalid or expired OTP');

    adminDoc.resetPasswordOTP = "";
    adminDoc.resetPasswordExpires = new Date(0);
    await AdminRepository.saveAdmin(adminDoc);
  },

  resetPassword: async (email: string, newPassword: string) => {
    const admin = await AdminRepository.findByEmail(email);
    if (!admin) throw new Error("Admin not found");

    // Ensure OTP session was recently cleared (optional safety check)
    if (admin.resetPasswordOTP || admin.resetPasswordExpires > new Date(0)) {
      throw new Error("Password reset not initiated or already completed");
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await AdminRepository.editAdmin(admin._id.toString(), {
      password: hashedPassword,
    });

    return { message: "Password reset successfully" };
  },
};