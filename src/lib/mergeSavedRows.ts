/**
 * Pairs each row from a PUT response back up with the client-side row it was
 * sent from, so React identity (__KEY__) survives the round trip. Matches by
 * backend `id` first — falls back to positional pairing only among rows that
 * don't have one yet (freshly-added rows), instead of assuming the response
 * keeps the exact order it was sent in. Returns each matched prev row
 * alongside so a caller can recurse into a nested collection.
 */
export function matchSavedRows<T extends { id?: number; __KEY__?: string }>(
  saved: T[],
  prev: T[]
): { row: T; matchedPrev: T | undefined }[] {
  const unmatchedPrev = [...prev];
  return saved.map((row) => {
    const idx =
      row.id !== undefined
        ? unmatchedPrev.findIndex((p) => p.id === row.id)
        : unmatchedPrev.findIndex((p) => p.id === undefined);
    const matchedPrev = idx !== -1 ? unmatchedPrev.splice(idx, 1)[0] : undefined;
    return { row, matchedPrev };
  });
}
