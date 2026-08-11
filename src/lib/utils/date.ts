/** Today's LOCAL date as YYYY-MM-DD (toISOString would give the UTC date,
 *  which is yesterday's between midnight and the UTC offset). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/** A `<input type="date">` value only collects a calendar day; the backend requires a full ISO-8601 datetime. */
export function toIsoDateTime(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toISOString();
}

/** Backend datetimes can arrive as "...T...Z" or the space-separated "... ...+00:00" variant. */
export function toDateInputValue(isoDateTime: string): string {
  const normalized = isoDateTime.includes('T') ? isoDateTime : isoDateTime.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? todayISO() : d.toISOString().slice(0, 10);
}

/** Standard display format for any backend datetime, e.g. "8/4/2026, 11:24 AM". */
export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
