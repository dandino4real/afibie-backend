

import mongoose from 'mongoose';

// types/admin.ts
export interface AdminType extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'superadmin';
  permissions: string[];
  refreshToken?: string | null;
  resetPasswordOTP?: string | null;
  resetPasswordExpires?: Date | null;
  status: 'active' | 'inactive' | 'suspended';
  lastIp?: string;
  lastLogin?: Date;
  createdAt: Date;
}

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Admin' },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  password: { type: String, required: true },
  phone: { type: String, required: false, default: '' },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  permissions: {
    type: [String],
    default: [],
  },
  refreshToken: { type: String, default: null },
  resetPasswordOTP: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive',
  },
  lastIp: { type: String },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const AdminModel = mongoose.model('Admin', AdminSchema);
 