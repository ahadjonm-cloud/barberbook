export function money(cents: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export function fmtTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function fmtDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

/** YYYY-MM-DD for "now" in the given time zone. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** YYYY-MM-DD of an instant in the given time zone. */
export function dateIn(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    day: d.toLocaleDateString(undefined, { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
  };
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const STATUS_LABEL: Record<string, string> = {
  booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};
