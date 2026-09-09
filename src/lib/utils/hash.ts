/** Deterministic string hash (djb2-ish, `>>> 0` keeps it a positive 32-bit
 *  int) — used to pick a stable color for a name from a fixed palette. */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
