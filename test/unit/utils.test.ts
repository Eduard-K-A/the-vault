import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatShortDate } from '@/utils/formatDate';
import { generateUUID } from '@/utils/generateUUID';
import { validatePrice } from '@/utils/validatePrice';
import { isStrongPassword, isValidEmail } from '@/utils/validators';

describe('utility functions', () => {
  it('validates email addresses', () => {
    expect(isValidEmail(' user@example.com ')).toBe(true);
    expect(isValidEmail('missing-at.example.com')).toBe(false);
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('accepts passwords with at least eight trimmed characters', () => {
    expect(isStrongPassword('12345678')).toBe(true);
    expect(isStrongPassword(' 12345678 ')).toBe(true);
    expect(isStrongPassword('1234567')).toBe(false);
  });

  it('formats Philippine peso currency', () => {
    expect(formatCurrency(1234.5)).toBe('₱1,234.50');
    expect(formatCurrency(0)).toBe('₱0.00');
  });

  it('formats full and short dates', () => {
    const date = new Date('2026-06-14T12:30:00.000Z');

    expect(formatDate(date)).toMatch(/Jun 14, 2026/);
    expect(formatShortDate(date)).toBe('Jun 14');
  });

  it('generates RFC 4122 version 4 shaped UUIDs', () => {
    expect(generateUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('validates prices for numeric database constraints', () => {
    expect(validatePrice(100)).toEqual({ isValid: true });
    expect(validatePrice('100.25')).toEqual({ isValid: true });
    expect(validatePrice(-1)).toEqual({ isValid: false, error: 'Price cannot be negative' });
    expect(validatePrice('1.234')).toEqual({ isValid: false, error: 'Price can have a maximum of 2 decimal places' });
    expect(validatePrice(Number.NaN)).toEqual({ isValid: false, error: 'Price must be a valid number' });
  });
});
