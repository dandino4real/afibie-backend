
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


export function isValidBybitUID(uid: string): boolean {
  return /^\d{5,10}$/.test(uid); // numeric, 8-10 digits
}
export function isValidWeexUID(uid: string): boolean {
  return /^\d{5,10}$/.test(uid); // numeric, 8-10 digits
}
export function isValidBlofinUID(uid: string): boolean {
  return /^\d{11,13}$/.test(uid); // numeric, 11-13 digits
}
export function isValidExcoUID(uid: string): boolean {
  return /^\d{6,9}$/.test(uid); // numeric, 6-9 digits
}