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
