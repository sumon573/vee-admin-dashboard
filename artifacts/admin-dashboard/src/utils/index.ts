/**
 * General-purpose utility functions.
 * UI-specific helpers live in src/lib/utils.ts (Tailwind cn helper).
 */

/**
 * Formats a number with comma separators.
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Truncates a string to a maximum length and appends an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Returns the user's initials from a display name.
 * @example getInitials("Jane Doe") → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Delays execution for the given number of milliseconds.
 * Useful in development/testing — avoid in production code.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
