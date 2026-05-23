import { randomBytes } from 'crypto';

export function generateId(prefix = ''): string {
  const id = randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function generateToken(): string {
  return randomBytes(24).toString('hex');
}
