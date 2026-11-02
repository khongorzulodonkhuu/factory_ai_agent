import type { Car, PriceBreakdown } from '../types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: string): number | null {
  if (typeof date !== 'string') return null;
  const m = DATE_RE.exec(date.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, mo - 1, d);
  if (Number.isNaN(ms)) return null;
  return ms;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Whole calendar days between pickup and return dates (times ignored). 0 when invalid or not after. */
export function rentalDays(pickupDate: string, returnDate: string): number {
  const a = toUtcMs(pickupDate);
  const b = toUtcMs(returnDate);
  if (a === null || b === null) return 0;
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 0;
}

export function calcTotal(days: number, dailyRate: number, cleaningFee: number): number {
  const total = num(days) * num(dailyRate) + num(cleaningFee);
  return Math.round(total * 100) / 100;
}

export function priceBreakdown(
  car: Pick<Car, 'dailyRate' | 'cleaningFee'>,
  pickupDate: string,
  returnDate: string,
): PriceBreakdown {
  const days = rentalDays(pickupDate, returnDate);
  const dailyRate = num(car?.dailyRate);
  const cleaningFee = num(car?.cleaningFee);
  return { days, dailyRate, cleaningFee, total: calcTotal(days, dailyRate, cleaningFee) };
}

export function isValidRange(pickupDate: string, returnDate: string): boolean {
  return rentalDays(pickupDate, returnDate) > 0;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysISO(date: string, n: number): string {
  const ms = toUtcMs(date);
  if (ms === null) return '';
  const d = new Date(ms + Math.round(num(n)) * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Times from 06:00 to 22:00 in 30-minute steps. */
export function timeOptions(): string[] {
  const out: string[] = [];
  for (let mins = 6 * 60; mins <= 22 * 60; mins += 30) {
    out.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
  }
  return out;
}
