/**
 * Price validation for NUMERIC(12,2) database constraint
 * Maximum value: 9,999,999,999.99 (12 digits total, 2 decimal places)
 */

const MAX_PRICE = 9999999999.99;
const MIN_PRICE = 0;

export interface PriceValidation {
  isValid: boolean;
  error?: string;
}

export function validatePrice(value: number | string): PriceValidation {
  const price = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(price)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (price < MIN_PRICE) {
    return { isValid: false, error: 'Price cannot be negative' };
  }

  if (price > MAX_PRICE) {
    return { isValid: false, error: `Price cannot exceed ${MAX_PRICE.toLocaleString()}` };
  }

  // Check decimal places (max 2)
  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Price can have a maximum of 2 decimal places' };
  }

  return { isValid: true };
}
