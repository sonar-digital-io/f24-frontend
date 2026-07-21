import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from a display name. Falls back to "untitled" when empty.
 *  Accented letters are transliterated (Szárny-Él → szarny-el) instead of dropped. */
export function slugify(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  );
}

/** Today's LOCAL date as YYYY-MM-DD (toISOString would give the UTC date,
 *  which is yesterday's between midnight and the UTC offset). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/** Ensure a slug is unique against a list of existing ids (appends -2, -3, …). */
export function uniqueId(base: string, exists: (id: string) => boolean): string {
  if (!exists(base)) return base;
  let n = 2;
  while (exists(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

let localIdCounter = 0;

/** Collision-free id for client-side rows (Date.now() collides on double-click). */
export function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${localIdCounter}`;
}
