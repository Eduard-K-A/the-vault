export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isStrongPassword(password: string): boolean {
  return password.trim().length >= 8;
}

export function isValidJoinCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.trim());
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

