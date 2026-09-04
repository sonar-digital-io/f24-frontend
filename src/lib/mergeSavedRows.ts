/**
 * Pairs a just-sent array with the backend's response to the same PUT, by
 * position, mapping each row's client-side `__KEY__` to whatever backend `id`
 * the response returned for it at that index — a full-collection PUT echoes
 * rows back in the same order it received them.
 *
 * Returns a `Map` rather than a merged array so a nested collection (e.g.
 * each fatigue profile's own `fatigue_cases`) can be folded into one flat
 * map across every level, and so callers apply it onto their own *latest*
 * state (not the `sent` snapshot) without this helper needing to know their
 * state shape. Never touches `__KEY__` itself — reassigning it on every save
 * changes a row's React key, forcing a remount that steals focus out of a
 * row the user is still editing.
 */
export function mapIdsByKey<Sent extends { __KEY__: string }, Saved extends { id?: number }>(
  sent: Sent[],
  saved: Saved[],
): Map<string, number> {
  const idByKey = new Map<string, number>();
  sent.forEach((row, i) => {
    const id = saved[i]?.id;
    if (id !== undefined) idByKey.set(row.__KEY__, id);
  });
  return idByKey;
}
