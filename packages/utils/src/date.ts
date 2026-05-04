// Avanti Date Utilities — Indian date formatting
// Indian format: DD/MM/YYYY (not MM/DD/YYYY)
// Calendar: Gregorian (schools use Gregorian, not Vikram Samvat)

/**
 * Formats a date in Indian style: DD/MM/YYYY
 * @returns e.g. "03/05/2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a date and time.
 * @returns e.g. "03/05/2026, 10:30 AM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats a date in long form.
 * @returns e.g. "3 May 2026"
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Returns the current Indian academic year string.
 * Indian academic year runs April–March.
 * @returns e.g. "2025-26"
 */
export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  if (month >= 4) {
    // April onwards — academic year started this year
    return `${year}-${String(year + 1).slice(2)}`;
  }
  // January–March — academic year started last year
  return `${year - 1}-${String(year).slice(2)}`;
}

/**
 * Returns start and end dates of a given academic year.
 * @param year e.g. "2025-26"
 */
export function academicYearDates(year: string): { start: Date; end: Date } {
  const startYear = parseInt(year.split('-')[0] ?? '0', 10);
  return {
    start: new Date(startYear, 3, 1),       // April 1
    end:   new Date(startYear + 1, 2, 31),  // March 31
  };
}

/**
 * Returns a relative time string.
 * @returns e.g. "2 hours ago", "just now", "3 days ago"
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return formatDate(d);
}
