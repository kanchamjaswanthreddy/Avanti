// Avanti Currency Utilities — Indian Rupee formatting
// Uses Intl.NumberFormat with locale 'en-IN' for proper lakh/crore notation.

/**
 * Formats a rupee amount from paise (stored value) to display string.
 * @param paise Amount in paise (1 INR = 100 paise)
 * @returns e.g. "₹1,50,000" or "₹14,999"
 */
export function formatRupees(paise: number | bigint): string {
  const amount = typeof paise === 'bigint' ? Number(paise) : paise;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

/**
 * Formats a rupee amount with paise (for fee receipts, payslips).
 * @param paise Amount in paise
 * @returns e.g. "₹14,999.50"
 */
export function formatRupeesWithPaise(paise: number | bigint): string {
  const amount = typeof paise === 'bigint' ? Number(paise) : paise;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/**
 * Formats a large number using Indian notation (lakhs and crores).
 * @returns e.g. "1.5 Cr", "25.3 L", "99,000"
 */
export function formatIndianNumber(value: number): string {
  if (value >= 10_000_000) {
    return `${(value / 10_000_000).toFixed(1)} Cr`;
  }
  if (value >= 100_000) {
    return `${(value / 100_000).toFixed(1)} L`;
  }
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Converts INR to paise for storage.
 * @param rupees e.g. 14999 → 1499900
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts paise to INR number.
 */
export function paiseToRupees(paise: number | bigint): number {
  const amount = typeof paise === 'bigint' ? Number(paise) : paise;
  return amount / 100;
}
