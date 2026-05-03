import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(8).toString("hex"); // 16 hex chars
}

export function isValidTokenFormat(token: string): boolean {
  return /^[a-f0-9]{16}$/.test(token);
}
