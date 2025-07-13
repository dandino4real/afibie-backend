export function generateCaptcha(): string {
  const random = Math.floor(100 + Math.random() * 900); // 3-digit number
  return random.toString();
}

export function verifyCaptcha(input: string, expected: string): boolean {
  return input.trim() === expected.trim();
}
