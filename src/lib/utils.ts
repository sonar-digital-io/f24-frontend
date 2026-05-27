import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from a display name. Falls back to "untitled" when empty. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  );
}

/** Today's date as YYYY-MM-DD (used as the "Last updated" value for new items). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ensure a slug is unique against a list of existing ids (appends -2, -3, …). */
export function uniqueId(base: string, exists: (id: string) => boolean): string {
  if (!exists(base)) return base;
  let n = 2;
  while (exists(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
