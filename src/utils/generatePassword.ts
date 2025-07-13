export function generateSecurePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const special = "!@#$%^&*()-_=+[]{}|;:,.<>?";
  const digits = "0123456789";
  const all = upper + lower + special + digits;

  const getRandom = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)];

  // Ensure minimum requirements
  const required = [
    getRandom(upper),
    getRandom(lower),
    getRandom(special),
    getRandom(digits),
  ];

  // Fill the rest randomly
  const remaining = Array.from({ length: length - required.length }, () =>
    getRandom(all)
  );

  // Shuffle final password
  const passwordArray = [...required, ...remaining].sort(() => 0.5 - Math.random());
  return passwordArray.join("");
}
