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

/** "Aug 4th, 2026" — date-range filter popover chip label. */
export function formatDateLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const s = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${s}, ${d.getFullYear()}`;
}

/** Parses a list page's "last updated" value for date-range filtering — handles the
 *  library "vYYYY/MM" format, a bare "YYYY-MM-DD", and backend datetime strings. */
export function parseLastUpdated(s: string): Date | null {
  const vMatch = s.match(/^v(\d{4})\/(\d{2})$/);
  if (vMatch) return new Date(`${vMatch[1]}-${vMatch[2]}-01T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  // Backend datetimes arrive as "...T...Z" or the space-separated "... ...+00:00" variant.
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}
