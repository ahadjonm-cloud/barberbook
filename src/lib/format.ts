import type { OrderStatus } from '../types';

export function money(amount: number, currency = 'UZS') {
  if (currency === 'UZS') return `${new Intl.NumberFormat('ru-RU').format(amount)} so'm`;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/** Commission split, matching the database's generated columns. */
export function split(price: number, percent: number) {
  const fee = Math.round((price * percent) / 100);
  return { fee, payout: price - fee };
}

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('uz-UZ', {
    day: 'numeric', month: 'long', weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Value for <input type="datetime-local"> in the browser's local time. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Ishchi kutilmoqda',
  accepted: 'Qabul qilindi',
  completed: 'Bajarildi',
  cancelled: 'Bekor qilindi',
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

export function errorText(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Xatolik yuz berdi';
}
