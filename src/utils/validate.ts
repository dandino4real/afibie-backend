
export function isValidUID(uid: string): boolean {
  return /^\d{6,20}$/.test(uid); // numeric, 6-20 digits
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// utils/validate.ts

export function isValidLoginID(uid: string): boolean {
  const trimmed = uid.trim();
  return /^[a-zA-Z0-9]{5,20}$/.test(trimmed);
}
