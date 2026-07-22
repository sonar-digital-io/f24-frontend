/** Today's LOCAL date as YYYY-MM-DD (toISOString would give the UTC date,
 *  which is yesterday's between midnight and the UTC offset). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}
