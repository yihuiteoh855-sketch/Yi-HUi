import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Shadcn-style class merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Malaysian Ringgit, e.g. 1234.5 -> "RM 1,234.50". */
export function formatRM(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const value = Math.abs(amount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}RM ${value}`;
}

/** Round to 2 decimal places (banker-free, deterministic). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function toISODateTime(ms: number): string {
  return new Date(ms).toISOString();
}

/** Day-of-month (1-31) in the sandbox clock's local interpretation (UTC, deterministic). */
export function dayOfMonth(ms: number): number {
  return new Date(ms).getUTCDate();
}

/** Days remaining in the month, counting the current day as remaining (>= 1). */
export function remainingDaysInMonth(ms: number): number {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.max(1, daysInMonth - d.getUTCDate() + 1);
}

export function daysInMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
