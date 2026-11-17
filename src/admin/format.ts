import { formatMinor, fromMinor, toMinor } from '../lib/money';

/** Money given in minor units, with its currency: "ETB 1,250.50". */
export const money = (minor: string | bigint | null | undefined, currency = 'ETB', minorUnits = 2): string =>
  minor === null || minor === undefined ? '—' : formatMinor(minor, currency, minorUnits);

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export const when = (iso: string | null | undefined): string => (iso ? dateTime.format(new Date(iso)) : '—');
export const day = (iso: string | null | undefined): string => (iso ? dateOnly.format(new Date(iso)) : '—');

/** "SCHEDULED" → "Scheduled", "PENDING_VERIFICATION" → "Pending verification". */
export const humanize = (value: string): string =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

/** An ISO time as the value of a datetime-local input, in this browser's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The value of a datetime-local input as an ISO time; null when empty or not a time. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Money typed in birr ("75", "0.50", "1,000") as minor units; null if it is not an amount. */
export const moneyToMinor = (text: string, minorUnits = 2): string | null => {
  const minor = toMinor(text.replace(/,/g, '').trim(), minorUnits);
  return minor === null ? null : minor.toString();
};

export const minorToText = (minor: string | null | undefined, minorUnits = 2): string =>
  minor === null || minor === undefined ? '' : fromMinor(minor, minorUnits).replace(/\.00$/, '');
