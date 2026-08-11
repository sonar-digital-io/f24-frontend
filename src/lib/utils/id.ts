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
