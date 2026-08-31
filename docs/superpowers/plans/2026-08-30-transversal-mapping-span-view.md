# Transversal Mapping Whole-Span Editing View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user see and edit a transversal mapping's boundary across every profile it spans in one chart, instead of one profile at a time via a popover with no visibility into in-between profiles.

**Architecture:** Extend `TransversalMapping`'s data model from two named-boundary fields to a `profileBoundaries: Record<profileId, ProfileBoundary>` covering every covered profile; add pure functions to maintain that map when the covered range changes and to re-interpolate inner profiles on demand; add a new chart component (reusing this codebase's existing `ChartFrame` SVG chart infra, not Konva) plotting each covered profile's boundary position, with drag-to-adjust and double-click-to-open-popover.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind, existing `ChartFrame`/`dataToPx`/`pxToData`/`useChartZoomPan` chart infra (`src/lib/bezierMath.ts`, `src/components/common/viewer/ChartFrame.tsx`).

**Spec:** `docs/superpowers/specs/2026-08-30-transversal-mapping-span-view-design.md`

## Global Constraints

- No test framework in this repo (`CodingConventions.md`) — every task's verification is
  `npx tsc --noEmit` (must be silent) + `npx prettier --check <changed files>` (must pass) +
  `npm run build` (must succeed) + a manual-check description. **Do not drive Playwright to
  verify** — describe what to click/observe in the browser and stop there; the user checks
  visually themselves (established preference).
- Every changed/new file must pass `npx prettier --write <file>` before being considered done —
  do not leave unformatted diffs (a prior PR in this repo was called out in review for exactly
  this).
- No `any`, no `@ts-ignore` — strict TypeScript throughout (`CodingConventions.md`).
- Positions are always `0..1` chordwise fractions; clamp on every write.
- Follow existing naming: `handle*` for local handlers, `on*` for props, PascalCase components.

---

### Task 1: `profileBoundaries` data model — replace the two-named-boundary fields

**Files:**
- Modify: `src/components/composition/TransversalMappingRow.tsx`
- Modify: `src/lib/transversalMapping.ts`
- Modify: `src/components/composition/TransversalMappingSection.tsx`

**Interfaces:**
- Produces: `ProfileBoundary` (unchanged shape), `EMPTY_BOUNDARY` (unchanged), `TransversalMapping`
  now has `profileBoundaries: Record<number, ProfileBoundary>` instead of
  `startProfileBoundary`/`endProfileBoundary`. New `getMappingBoundary(mapping: TransversalMapping,
  profileId: number | null): ProfileBoundary`.
- Consumes (later tasks depend on this): `getMappingBoundary`, `TransversalMapping.profileBoundaries`.

This task is a pure refactor — no new user-visible behavior. The existing "pencil button opens a
popover for the start or end profile" flow keeps working identically; it now reads/writes through
`profileBoundaries` instead of the two named fields.

- [ ] **Step 1: Change the `TransversalMapping` type and add the helper**

In `src/components/composition/TransversalMappingRow.tsx`, replace:

```ts
export interface TransversalMapping {
  id: string;
  groupId: string;
  name: string;
  layupId: string | null;
  startProfileId: number | null;
  endProfileId: number | null;
  startProfileBoundary: ProfileBoundary;
  endProfileBoundary: ProfileBoundary;
}
```

with:

```ts
export interface TransversalMapping {
  id: string;
  groupId: string;
  name: string;
  layupId: string | null;
  startProfileId: number | null;
  endProfileId: number | null;
  /** Every profile from startProfileId to endProfileId (inclusive, by span
   *  position) gets its own boundary — keyed by profile id. */
  profileBoundaries: Record<number, ProfileBoundary>;
}

/** `mapping.profileBoundaries[profileId]`, or EMPTY_BOUNDARY if that profile
 *  isn't covered (or profileId is null, e.g. a not-yet-selected profile). */
export function getMappingBoundary(
  mapping: TransversalMapping,
  profileId: number | null,
): ProfileBoundary {
  if (profileId == null) return EMPTY_BOUNDARY;
  return mapping.profileBoundaries[profileId] ?? EMPTY_BOUNDARY;
}
```

Leave `ProfileBoundary` and `EMPTY_BOUNDARY` exactly as they are.

- [ ] **Step 2: Update `hydrateTransversalMappings` to keep the full per-profile map**

In `src/lib/transversalMapping.ts`, the function already builds
`byProfileId: Map<number, ProfileBoundary>` with every profile in the group — it currently
discards everything except the min/max entries. Replace the `return` block at the end of
`hydrateTransversalMappings`:

```ts
  return Array.from(groups.entries()).map(([groupId, g]) => {
    const sorted = [...g.byProfileId.keys()].sort(
      (a, b) => (profileById.get(a)?.position ?? 0) - (profileById.get(b)?.position ?? 0),
    );
    const startProfileId = sorted[0];
    const endProfileId = sorted[sorted.length - 1];
    return {
      id: crypto.randomUUID(),
      groupId,
      name: g.name,
      layupId: String(g.layup),
      startProfileId,
      endProfileId,
      profileBoundaries: Object.fromEntries(g.byProfileId),
    };
  });
```

(`profileById` is still used for sorting — keep it. Only the returned object's shape changed.)

- [ ] **Step 3: Update `buildTransversalMappingPayload` to read through `profileBoundaries`**

Still in `src/lib/transversalMapping.ts`. The function currently reads `m.startProfileBoundary`/
`m.endProfileBoundary` and interpolates everything in between inline. For this task, make the
minimal change to keep it compiling and behaviorally identical — read the two boundary values via
`getMappingBoundary` instead of the old field names, everything else (the inline lerp for
in-between profiles) stays as-is for now (Task 3 replaces the interpolation itself). Replace:

```ts
  mappings.forEach((m, rowIndex) => {
    const { startProfileId, endProfileId, startProfileBoundary: sb, endProfileBoundary: eb } = m;
```

with:

```ts
  mappings.forEach((m, rowIndex) => {
    const { startProfileId, endProfileId } = m;
    const sb = getMappingBoundary(m, startProfileId);
    const eb = getMappingBoundary(m, endProfileId);
```

Add `getMappingBoundary` to the existing import of `TransversalMappingRow` types at the top of the
file:

```ts
import type {
  ProfileBoundary,
  TransversalMapping,
  getMappingBoundary,
} from '@/components/composition/TransversalMappingRow';
```

Wait — `getMappingBoundary` is a value (function), not a type, so it needs its own non-`type`
import. Change the import block to:

```ts
import type { ProfileBoundary, TransversalMapping } from '@/components/composition/TransversalMappingRow';
import { getMappingBoundary } from '@/components/composition/TransversalMappingRow';
```

- [ ] **Step 4: Update `TransversalMappingSection.tsx`'s draft/update/popover wiring**

In `src/components/composition/TransversalMappingSection.tsx`:

Replace `newDraft()`'s body:

```ts
function newDraft(): TransversalMapping {
  return {
    id: crypto.randomUUID(),
    groupId: crypto.randomUUID(),
    name: '',
    layupId: null,
    startProfileId: null,
    endProfileId: null,
    profileBoundaries: {},
  };
}
```

Change the `OpenBoundaryEditor` interface and every place that constructs/reads it — this is the
one behavior-shaping change in this task, done now so Task 4 doesn't have to touch it again.
Replace:

```ts
interface OpenBoundaryEditor {
  mappingId: string;
  side: 'start' | 'end';
}
```

with:

```ts
interface OpenBoundaryEditor {
  mappingId: string;
  profileId: number;
}
```

Replace `updateBoundary`:

```ts
  function updateBoundary(id: string, side: 'start' | 'end', patch: Partial<TransversalMapping['startProfileBoundary']>) {
    setMappings((arr) =>
      arr.map((m) => {
        if (m.id !== id) return m;
        const key = side === 'start' ? 'startProfileBoundary' : 'endProfileBoundary';
        return { ...m, [key]: { ...m[key], ...patch } };
      }),
    );
  }
```

with:

```ts
  function updateBoundary(id: string, profileId: number, patch: Partial<ProfileBoundary>) {
    setMappings((arr) =>
      arr.map((m) => {
        if (m.id !== id) return m;
        const current = getMappingBoundary(m, profileId);
        return {
          ...m,
          profileBoundaries: { ...m.profileBoundaries, [profileId]: { ...current, ...patch } },
        };
      }),
    );
  }
```

Add `ProfileBoundary` and `getMappingBoundary` to the existing `TransversalMappingRow` import:

```ts
import {
  EMPTY_BOUNDARY,
  TransversalMappingRow,
  getMappingBoundary,
  type ProfileBoundary,
  type TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
```

(`EMPTY_BOUNDARY` is currently imported but only used by the old `newDraft()` body — Step 4 above
removed that use. Check whether anything else in this file still references `EMPTY_BOUNDARY`; if
not, drop it from the import — `noUnusedLocals` will fail the build otherwise.)

Replace the two row callbacks:

```tsx
                onEditStartProfile={() => setBoundaryEditor({ mappingId: m.id, side: 'start' })}
                onEditEndProfile={() => setBoundaryEditor({ mappingId: m.id, side: 'end' })}
```

with:

```tsx
                onEditStartProfile={() =>
                  m.startProfileId != null &&
                  setBoundaryEditor({ mappingId: m.id, profileId: m.startProfileId })
                }
                onEditEndProfile={() =>
                  m.endProfileId != null &&
                  setBoundaryEditor({ mappingId: m.id, profileId: m.endProfileId })
                }
```

Replace the `editingMapping`/`editingProfileId` derivation:

```ts
  const editingMapping = boundaryEditor ? mappings.find((m) => m.id === boundaryEditor.mappingId) : undefined;
  const editingProfileId = editingMapping
    ? boundaryEditor!.side === 'start'
      ? editingMapping.startProfileId
      : editingMapping.endProfileId
    : null;
```

with:

```ts
  const editingMapping = boundaryEditor ? mappings.find((m) => m.id === boundaryEditor.mappingId) : undefined;
  const editingProfileId = editingMapping ? boundaryEditor!.profileId : null;
```

Replace the `otherRings` computation's use of the old fields:

```ts
            if (m.startProfileId === editingProfileId && m.startProfileBoundary.startPosition != null && m.startProfileBoundary.endPosition != null) {
              rings.push({ startFrac: m.startProfileBoundary.startPosition, endFrac: m.startProfileBoundary.endPosition });
            }
            if (m.endProfileId === editingProfileId && m.endProfileBoundary.startPosition != null && m.endProfileBoundary.endPosition != null) {
              rings.push({ startFrac: m.endProfileBoundary.startPosition, endFrac: m.endProfileBoundary.endPosition });
            }
```

with (a mapping only needs checking once now — any covered profile, not just its two named ends,
can equal `editingProfileId`):

```ts
            const b = getMappingBoundary(m, editingProfileId);
            if (b.startPosition != null && b.endPosition != null) {
              rings.push({ startFrac: b.startPosition, endFrac: b.endPosition });
            }
```

(this changes `otherRings`'s `.flatMap` callback body — the surrounding `.filter(...).flatMap((m) => { ... })` structure stays, only what's inside changes)

Finally, replace the popover's `boundary`/`onChange` props:

```tsx
              boundary={boundaryEditor!.side === 'start' ? editingMapping.startProfileBoundary : editingMapping.endProfileBoundary}
              lockOptions={editingLockOptions}
              otherRings={otherRings}
              onChange={(patch) => updateBoundary(editingMapping.id, boundaryEditor!.side, patch)}
```

with:

```tsx
              boundary={getMappingBoundary(editingMapping, editingProfileId)}
              lockOptions={editingLockOptions}
              otherRings={otherRings}
              onChange={(patch) => updateBoundary(editingMapping.id, editingProfileId!, patch)}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```
Expected: no output (clean). If you see errors referencing `startProfileBoundary`/
`endProfileBoundary`/`side`, you missed a call site above — search the whole file for those three
strings and fix every remaining hit.

```bash
npx prettier --write src/components/composition/TransversalMappingRow.tsx src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
npx prettier --check src/components/composition/TransversalMappingRow.tsx src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
npm run build
```
Expected: all clean.

**Manual check:** open a composition with saved transversal mappings, go to the Transversal
mapping tab. It should look and behave exactly as before this task — click the pencil button on a
row's start or end profile, the same popover opens with the same position/lock fields, dragging
still works. Nothing should look different; this task only changed what's under the hood.

- [ ] **Step 6: Commit**

```bash
git add src/components/composition/TransversalMappingRow.tsx src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
git commit -m "Replace two-named-boundary fields with a per-profile boundary map

TransversalMapping.profileBoundaries: Record<profileId, ProfileBoundary>
replaces startProfileBoundary/endProfileBoundary — hydrateTransversalMappings
already built this full per-profile map and was discarding everything except
the two endpoints. No behavior change yet; this is the data-model groundwork
for editing inner-profile boundaries (docs/superpowers/specs/2026-08-30-transversal-mapping-span-view-design.md)."
```

---

### Task 2: `resizeMappingRange` — maintain `profileBoundaries` when start/end profile changes

**Files:**
- Modify: `src/lib/transversalMapping.ts`
- Modify: `src/components/composition/TransversalMappingSection.tsx`

**Interfaces:**
- Consumes: `TransversalMapping`, `ProfileBoundary`, `EMPTY_BOUNDARY`, `GeometryProfile` (from
  `@/api/types/geometry`, has `id: number; position: number`).
- Produces: `resizeMappingRange(mapping: TransversalMapping, profiles: GeometryProfile[]):
  TransversalMapping`, consumed by `TransversalMappingSection.updateMapping`.

- [ ] **Step 1: Write `resizeMappingRange`**

Add to `src/lib/transversalMapping.ts` (near the top, after the existing imports — it needs
`GeometryProfile`, already imported in this file):

```ts
/**
 * Keeps `profileBoundaries` in sync with the mapping's current
 * startProfileId/endProfileId: seeds EMPTY_BOUNDARY for any profile newly in
 * range, and drops entries for profiles no longer in range. Call this
 * whenever startProfileId/endProfileId changes — before this call, a
 * profile's boundary can be stale (left over from a previous range) or
 * missing (freshly entered the range).
 */
export function resizeMappingRange(
  mapping: TransversalMapping,
  profiles: GeometryProfile[],
): TransversalMapping {
  const { startProfileId, endProfileId } = mapping;
  if (startProfileId == null || endProfileId == null) {
    return { ...mapping, profileBoundaries: {} };
  }
  const sorted = [...profiles].sort((a, b) => a.position - b.position);
  const startIdx = sorted.findIndex((p) => p.id === startProfileId);
  const endIdx = sorted.findIndex((p) => p.id === endProfileId);
  if (startIdx === -1 || endIdx === -1) return mapping;
  const [loIdx, hiIdx] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  const covered = sorted.slice(loIdx, hiIdx + 1);
  const coveredIds = new Set(covered.map((p) => p.id));

  const next: Record<number, ProfileBoundary> = {};
  covered.forEach((p) => {
    next[p.id] = mapping.profileBoundaries[p.id] ?? EMPTY_BOUNDARY;
  });
  // Anything still in `mapping.profileBoundaries` but not in `coveredIds` is
  // pruned by simply not copying it into `next`.
  void coveredIds; // documents intent; `next` construction above already excludes them

  return { ...mapping, profileBoundaries: next };
}
```

(The `void coveredIds;` line and its comment exist only to make the "we deliberately exclude
anything not in range" reasoning visible to a reader — `coveredIds` isn't otherwise used since the
`covered.forEach` loop already only touches in-range profiles. This is fine as written; don't
"clean up" the unused-looking variable into something more clever, it's already minimal.)

- [ ] **Step 2: Wire it into `TransversalMappingSection.updateMapping`**

In `src/components/composition/TransversalMappingSection.tsx`, replace:

```ts
  function updateMapping(id: string, patch: Partial<TransversalMapping>) {
    setMappings((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
```

with:

```ts
  function updateMapping(id: string, patch: Partial<TransversalMapping>) {
    setMappings((arr) =>
      arr.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        if ('startProfileId' in patch || 'endProfileId' in patch) {
          return resizeMappingRange(next, crossSectionProfiles);
        }
        return next;
      }),
    );
  }
```

Add `resizeMappingRange` to the existing `@/lib/transversalMapping` import:

```ts
import {
  describeIntersection,
  buildTransversalMappingPayload,
  hydrateTransversalMappings,
  resizeMappingRange,
} from '@/lib/transversalMapping';
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx prettier --write src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
npx prettier --check src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
npm run build
```
Expected: all clean.

**Manual check:** open the Transversal mapping tab, add a new mapping, pick a start profile and an
end profile 3–4 profiles further along the span. Open the end profile's boundary popover and set a
position — then change the end-profile dropdown to an even further profile. The previously-set
position should still be there if you switch back (nothing resets), and the newly-added profiles
in between should exist with empty boundaries (verify by opening their popover once Task 4 makes
that reachable — for this task, it's enough that `tsc`/build stay clean and the existing two-button
flow still works with no crash when you change the end profile repeatedly).

- [ ] **Step 4: Commit**

```bash
git add src/lib/transversalMapping.ts src/components/composition/TransversalMappingSection.tsx
git commit -m "Maintain profileBoundaries range when start/end profile changes

resizeMappingRange seeds EMPTY_BOUNDARY for profiles newly covered and drops
entries for profiles no longer covered, called from updateMapping whenever a
patch touches startProfileId/endProfileId."
```

---

### Task 3: `isSameLandmark` + `recalculateInnerProfiles` — spanwise interpolation

**Files:**
- Modify: `src/lib/transversalMapping.ts`

**Interfaces:**
- Consumes: `CompositionIntersection` (from `@/api/types/composition`, has `id: number; position:
  number; type: 'edge' | 'mapping'; spar_id: number | null; longitudinal_mapping_id: number | null;
  index: number | null; side: 'upper' | 'lower' | null`), `CompositionProfileIntersections`
  (`{ profile_id: number; intersections: CompositionIntersection[] }`), `GeometryProfile`.
- Produces: `isSameLandmark(a: CompositionIntersection, b: CompositionIntersection): boolean`,
  `recalculateInnerProfiles(mapping: TransversalMapping, coveredProfilesSortedByPosition:
  GeometryProfile[], intersectionsData: CompositionProfileIntersections[] | undefined):
  TransversalMapping` — both consumed by Task 4's chart component ("Recalculate" button).

This task adds two pure functions with no UI trigger yet (Task 4 wires the Recalculate button) —
`isSameLandmark` and `recalculateInnerProfiles` are verified by `tsc`/build plus reasoning through
them by hand. It also fixes `buildTransversalMappingPayload` (Step 3) to stop discarding
per-profile edits at save time — that fix *is* exercised immediately by every existing save, not
just once Task 4 lands.

- [ ] **Step 1: Write `isSameLandmark`**

Add to `src/lib/transversalMapping.ts`, near `findNearestIntersectionId`:

```ts
/**
 * Whether two intersections are "the same landmark" — e.g. both are the
 * same spar, or both are the profile's leading edge — so that if a
 * mapping's two boundary profiles are both locked to the same landmark
 * type, an inner profile between them can be locked to *its own* instance
 * of that same landmark instead of interpolating a plain number.
 *
 * This backend's CompositionIntersection has `type: 'edge' | 'mapping'`
 * plus nullable `spar_id`/`longitudinal_mapping_id` (unlike the reference
 * architecture's dedicated `type: 'spar'`) — spar identity lives in
 * `spar_id`, so two intersections are the same landmark when `type`,
 * `spar_id`, `longitudinal_mapping_id`, `index`, and `side` all match, and
 * — only for a bare profile edge (both spar_id and longitudinal_mapping_id
 * null) — they're both the trailing edge or both the leading edge
 * (position === 0 is always the trailing edge; a profile has exactly one
 * other edge intersection, the leading edge, at some other position).
 */
export function isSameLandmark(a: CompositionIntersection, b: CompositionIntersection): boolean {
  if (a.type !== b.type) return false;
  if (a.spar_id !== b.spar_id) return false;
  if (a.longitudinal_mapping_id !== b.longitudinal_mapping_id) return false;
  if (a.index !== b.index) return false;
  if (a.side !== b.side) return false;
  if (a.spar_id == null && a.longitudinal_mapping_id == null) {
    return (a.position === 0) === (b.position === 0);
  }
  return true;
}
```

Add `CompositionIntersection` to the existing `@/api/types/composition` type import at the top of
the file (it currently imports `CompositionIntersection` already if you check — verify with
`grep -n "CompositionIntersection" src/lib/transversalMapping.ts` before adding a duplicate; the
existing import block is:

```ts
import type {
  CompositionIntersection,
  CompositionMappingTransversalResponse,
  CompositionMappingTransversalWritePayload,
  CompositionProfileIntersections,
} from '@/api/types/composition';
```

— `CompositionIntersection` is already imported. No import change needed for this step.)

- [ ] **Step 2: Write `recalculateInnerProfiles`**

Add directly below `isSameLandmark`:

```ts
function findLandmarkOnProfile(
  profileId: number,
  landmark: CompositionIntersection,
  intersectionsData: CompositionProfileIntersections[] | undefined,
): CompositionIntersection | null {
  const list = intersectionsData?.find((p) => p.profile_id === profileId)?.intersections ?? [];
  return list.find((candidate) => isSameLandmark(candidate, landmark)) ?? null;
}

function findIntersectionById(
  profileId: number,
  intersectionId: number | null,
  intersectionsData: CompositionProfileIntersections[] | undefined,
): CompositionIntersection | null {
  if (intersectionId == null) return null;
  const list = intersectionsData?.find((p) => p.profile_id === profileId)?.intersections ?? [];
  return list.find((i) => i.id === intersectionId) ?? null;
}

/**
 * Re-interpolates every profile strictly between the mapping's start and
 * end profile, for both the start and end position independently. If both
 * boundary profiles are locked to "the same landmark" (isSameLandmark) and
 * an inner profile has an intersection matching that same landmark, the
 * inner profile locks to it (its position becomes that intersection's
 * position); otherwise the inner profile's position is linearly
 * interpolated by span position between the two boundary profiles, and
 * unlocked (lockedTo: null).
 *
 * Does nothing to the two boundary profiles themselves — only profiles
 * strictly between them. Call this explicitly (e.g. a "Recalculate"
 * button); it is never run automatically, so a manually-dragged inner
 * point stays where the user put it until they ask to re-snap it.
 */
export function recalculateInnerProfiles(
  mapping: TransversalMapping,
  coveredProfilesSortedByPosition: GeometryProfile[],
  intersectionsData: CompositionProfileIntersections[] | undefined,
): TransversalMapping {
  if (coveredProfilesSortedByPosition.length < 3) return mapping; // no inner profiles to touch
  const first = coveredProfilesSortedByPosition[0];
  const last = coveredProfilesSortedByPosition[coveredProfilesSortedByPosition.length - 1];
  const startBoundary = getMappingBoundary(mapping, first.id);
  const endBoundary = getMappingBoundary(mapping, last.id);
  const spanRange = last.position - first.position || 1;

  const next = { ...mapping.profileBoundaries };

  (['start', 'end'] as const).forEach((side) => {
    const posKey = side === 'start' ? 'startPosition' : 'endPosition';
    const lockKey = side === 'start' ? 'startLockedTo' : 'endLockedTo';
    const firstPos = startBoundary[posKey];
    const lastPos = endBoundary[posKey];
    if (firstPos == null || lastPos == null) return; // nothing to interpolate from

    const firstLandmark = findIntersectionById(first.id, startBoundary[lockKey], intersectionsData);
    const lastLandmark = findIntersectionById(last.id, endBoundary[lockKey], intersectionsData);
    const sameLandmarkLock =
      firstLandmark && lastLandmark && isSameLandmark(firstLandmark, lastLandmark) ? firstLandmark : null;

    coveredProfilesSortedByPosition.slice(1, -1).forEach((profile) => {
      const current = next[profile.id] ?? { ...EMPTY_BOUNDARY };
      const equivalentLandmark = sameLandmarkLock
        ? findLandmarkOnProfile(profile.id, sameLandmarkLock, intersectionsData)
        : null;
      if (equivalentLandmark) {
        next[profile.id] = { ...current, [posKey]: equivalentLandmark.position, [lockKey]: equivalentLandmark.id };
        return;
      }
      const t = (profile.position - first.position) / spanRange;
      const interpolated = firstPos + (lastPos - firstPos) * t;
      next[profile.id] = { ...current, [posKey]: interpolated, [lockKey]: null };
    });
  });

  return { ...mapping, profileBoundaries: next };
}
```

Add `GeometryProfile` to the existing `@/api/types/geometry` type import (check
`grep -n "GeometryProfile" src/lib/transversalMapping.ts` — it's already imported for
`buildTransversalMappingPayload`'s `profiles: GeometryProfile[]` parameter, so no import change
needed).

- [ ] **Step 3: Make `buildTransversalMappingPayload` respect each profile's own boundary**

**This step matters — skipping it silently breaks the whole feature.** Task 1 left
`buildTransversalMappingPayload` always re-computing every inner profile's position via its own
inline lerp, ignoring whatever is actually sitting in `profileBoundaries` for that profile. Once
Task 4 lets a user drag an inner profile's point or lock it to an intersection, saving would throw
that edit away and silently replace it with a fresh linear interpolation every time — the per-profile
data model from Task 1 would exist but have no effect. Fix it now: prefer each profile's own
boundary when it has one, and fall back to a fresh lerp only for a profile that was never touched
(still sitting at `EMPTY_BOUNDARY` from `resizeMappingRange`).

Replace the whole `covered.forEach` block inside `buildTransversalMappingPayload`:

```ts
    let resolvedAny = false;
    covered.forEach((profile) => {
      let boundary: ProfileBoundary;
      if (profile.id === loProfile) boundary = loBoundary;
      else if (profile.id === hiProfile) boundary = hiBoundary;
      else {
        const t = (profile.position - sortedProfiles[loIdx].position) / spanRange;
        boundary = {
          startPosition: lerp(loBoundary.startPosition!, hiBoundary.startPosition!, t),
          startLockedTo: null,
          endPosition: lerp(loBoundary.endPosition!, hiBoundary.endPosition!, t),
          endLockedTo: null,
        };
      }
      const startLockedTo = resolveLockedTo(profile.id, boundary.startLockedTo, boundary.startPosition, intersectionsData);
      const endLockedTo = resolveLockedTo(profile.id, boundary.endLockedTo, boundary.endPosition, intersectionsData);
      const arr = byProfile.get(profile.id);
      if (startLockedTo == null || endLockedTo == null || !arr) return;
      resolvedAny = true;
      arr.push({
        name: m.name,
        group_id: m.groupId,
        layup: Number(m.layupId),
        row_index: rowIndex,
        start_locked_to: startLockedTo,
        end_locked_to: endLockedTo,
      });
    });
```

with:

```ts
    let resolvedAny = false;
    covered.forEach((profile) => {
      // Prefer this profile's own explicitly-set boundary (drag, lock
      // selection, or a previous Recalculate) — only fall back to a fresh
      // lerp for a position this profile never got (still EMPTY_BOUNDARY).
      const own = getMappingBoundary(m, profile.id);
      const t = (profile.position - sortedProfiles[loIdx].position) / spanRange;
      const boundary: ProfileBoundary = {
        startPosition: own.startPosition ?? lerp(loBoundary.startPosition!, hiBoundary.startPosition!, t),
        startLockedTo: own.startLockedTo,
        endPosition: own.endPosition ?? lerp(loBoundary.endPosition!, hiBoundary.endPosition!, t),
        endLockedTo: own.endLockedTo,
      };
      const startLockedTo = resolveLockedTo(profile.id, boundary.startLockedTo, boundary.startPosition, intersectionsData);
      const endLockedTo = resolveLockedTo(profile.id, boundary.endLockedTo, boundary.endPosition, intersectionsData);
      const arr = byProfile.get(profile.id);
      if (startLockedTo == null || endLockedTo == null || !arr) return;
      resolvedAny = true;
      arr.push({
        name: m.name,
        group_id: m.groupId,
        layup: Number(m.layupId),
        row_index: rowIndex,
        start_locked_to: startLockedTo,
        end_locked_to: endLockedTo,
      });
    });
```

`loProfile`/`hiProfile` (the two variables the old version branched on) are now unused in this
function — remove their declaration line (`const [loProfile, hiProfile] = startIdx <= endIdx ? ...`)
if `tsc`'s `noUnusedLocals` flags it in Step 4 below.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: clean. If you see an unused-variable error for `loProfile`/`hiProfile`, remove that
declaration per the note at the end of Step 3. If `EMPTY_BOUNDARY` isn't imported in this file yet,
add it — it already is (used elsewhere in this file's `resolveLockedTo`/hydrate logic per Task 1);
if `tsc` complains it's undefined, `grep -n "EMPTY_BOUNDARY" src/lib/transversalMapping.ts` and add
`import { EMPTY_BOUNDARY } from '@/components/composition/TransversalMappingRow';` (as a value
import, not `type`) if genuinely missing.

```bash
npx prettier --write src/lib/transversalMapping.ts
npx prettier --check src/lib/transversalMapping.ts
npm run build
```
Expected: all clean.

**Manual check:** `recalculateInnerProfiles` itself has no UI trigger until Task 4, but the
`buildTransversalMappingPayload` change in Step 3 is exercised by every existing save — open a
composition with saved transversal mappings, change nothing, hit Save, confirm it still succeeds
with no console errors (regression check: existing two-endpoint-only mappings, where every inner
profile is still `EMPTY_BOUNDARY`, must produce the exact same lerp-based payload as before).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transversalMapping.ts
git commit -m "Add recalculateInnerProfiles; make save-time payload respect per-profile edits

recalculateInnerProfiles ports the reference architecture's §4.6 interpolation
rule: if a mapping's two boundary profiles are locked to the same landmark
(isSameLandmark — same type/spar_id/longitudinal_mapping_id/index/side, or
both the same profile edge), an inner profile locks to its own instance of
that landmark instead of getting a plain interpolated number. Not yet wired
to any UI — Task 4 adds the Recalculate button that calls it.

Also fixed buildTransversalMappingPayload, which was unconditionally
re-lerping every inner profile at save time regardless of what Task 1's
profileBoundaries map actually held for it — that would have silently
discarded any drag/lock edit Task 4 lets a user make on an inner profile.
It now prefers each profile's own boundary and only falls back to a fresh
lerp for a profile that was never touched."
```

---

### Task 4: `TransversalMappingSpanChart` — the whole-span chart, wired into the section

**Files:**
- Create: `src/components/composition/TransversalMappingSpanChart.tsx`
- Modify: `src/components/composition/TransversalMappingSection.tsx`
- Modify: `src/components/composition/TransversalMappingRow.tsx`

**Interfaces:**
- Consumes: `ChartFrame` (`@/components/common/viewer/ChartFrame`, props: `svgRef`, `ariaLabel`,
  `viewX/viewY/viewW/viewH`, `zoom`, `panningPointerId`, `bgPointerHandlers`, `onBgDoubleClick`,
  `zoomControlProps`, `xTicks/yTicks`, `xMin/xMax/yMin/yMax`, `xDecimals/yDecimals`, `xUnit/yUnit`,
  `className`, `children`), `useChartZoomPan` (`@/hooks/useChartZoomPan`, returns `{ zoom, viewX,
  viewY, viewW, viewH, panningPointerId, screenToViewBox, resetView, bgPointerHandlers,
  zoomControlProps }`), `dataToPx`/`pxToData`/`computeChartAxis` (`@/lib/bezierMath`),
  `GeometryProfile`, `TransversalMapping`, `ProfileBoundary`, `getMappingBoundary`.
- Produces: `TransversalMappingSpanChart` component, rendered from
  `TransversalMappingSection.tsx` in place of the two per-row pencil buttons.

- [ ] **Step 1: Replace the two pencil-button cells in `TransversalMappingRow.tsx` with one "Edit
  span" button**

In `src/components/composition/TransversalMappingRow.tsx`, the props interface currently has:

```ts
  onEditStartProfile: () => void;
  onEditEndProfile: () => void;
```

Replace with a single callback:

```ts
  onEditSpan: () => void;
```

Replace the two `<td>` blocks that render the profile `SelectField` + pencil button (start-profile
cell and end-profile cell) — keep the `SelectField`s (still needed to pick which profiles the
mapping spans), just drop the per-cell pencil `<button>`. After the two `SelectField` `<td>`s, add
one more `<td>` with a single button:

```tsx
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onEditSpan}
          disabled={m.startProfileId == null || m.endProfileId == null}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#eef9ff] px-2 text-[12px] font-medium text-[#006496] hover:bg-[#dcf1ff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Edit span
        </button>
      </td>
```

(This is a new column, not a replacement for an existing `<td>` — the table header in
`TransversalMappingSection.tsx` needs one more `<th>` too, see Step 4 below.)

- [ ] **Step 2: Write `TransversalMappingSpanChart.tsx`**

```tsx
import { useRef, useState } from 'react';
import { ChartFrame } from '@/components/common/viewer/ChartFrame';
import { useChartZoomPan } from '@/hooks/useChartZoomPan';
import { dataToPx, pxToData, computeChartAxis } from '@/lib/bezierMath';
import {
  getMappingBoundary,
  type ProfileBoundary,
  type TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import type { GeometryProfile } from '@/api/types/geometry';

interface TransversalMappingSpanChartProps {
  mapping: TransversalMapping;
  coveredProfilesSortedByPosition: GeometryProfile[];
  onChangeBoundary: (profileId: number, field: 'startPosition' | 'endPosition', position: number) => void;
  onOpenProfileEditor: (profileId: number) => void;
  onRecalculate: () => void;
  onClose: () => void;
}

type DragTarget = { profileId: number; field: 'startPosition' | 'endPosition' } | null;

const Y_MIN = 0;
const Y_MAX = 1;
const Y_STEP = 0.1;

/**
 * Whole-span view of one transversal mapping: X = each covered profile's
 * real spanwise position, Y = chordwise position (0-1). Two point series
 * (start boundary, end boundary) connected by a polyline each — since inner
 * points are either locked (pinned) or linearly interpolated by
 * construction, the polyline itself is the live interpolation preview.
 * Locked points aren't draggable (drag the lock target via the popover
 * instead, opened by double-clicking any point). See
 * docs/superpowers/specs/2026-08-30-transversal-mapping-span-view-design.md.
 */
export function TransversalMappingSpanChart({
  mapping,
  coveredProfilesSortedByPosition,
  onChangeBoundary,
  onOpenProfileEditor,
  onRecalculate,
  onClose,
}: TransversalMappingSpanChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const {
    zoom,
    viewX,
    viewY,
    viewW,
    viewH,
    panningPointerId,
    screenToViewBox,
    resetView,
    bgPointerHandlers,
    zoomControlProps,
  } = useChartZoomPan(svgRef);

  const profiles = coveredProfilesSortedByPosition;
  if (profiles.length === 0) return null;
  const xMin = profiles[0].position;
  const xMax = profiles[profiles.length - 1].position || xMin + 1;
  const xAxis = computeChartAxis(xMin, xMax, (xMax - xMin) / 5 || 1);
  const yAxis = computeChartAxis(Y_MIN, Y_MAX, Y_STEP);

  function project(x: number, y: number) {
    return dataToPx({ x, y }, xMin, xMax, Y_MIN, Y_MAX);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragTarget) return;
    const local = screenToViewBox(e.clientX, e.clientY);
    if (!local) return;
    const data = pxToData(local.x, local.y, xMin, xMax, Y_MIN, Y_MAX);
    const clamped = Math.max(0, Math.min(1, data.y));
    onChangeBoundary(dragTarget.profileId, dragTarget.field, clamped);
  }

  function handlePointerUp() {
    setDragTarget(null);
  }

  function renderSeries(field: 'startPosition' | 'endPosition', color: string) {
    const points = profiles
      .map((p) => ({ profile: p, boundary: getMappingBoundary(mapping, p.id) }))
      .filter(({ boundary }) => boundary[field] != null);

    const linePoints = points
      .map(({ profile, boundary }) => {
        const { cx, cy } = project(profile.position, boundary[field]!);
        return `${cx.toFixed(1)},${cy.toFixed(1)}`;
      })
      .join(' ');

    return (
      <g key={field}>
        {linePoints && (
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        )}
        {points.map(({ profile, boundary }) => {
          const { cx, cy } = project(profile.position, boundary[field]!);
          const lockKey = field === 'startPosition' ? 'startLockedTo' : 'endLockedTo';
          const locked = boundary[lockKey] != null;
          return (
            <g key={profile.id}>
              {locked ? (
                <rect
                  x={cx - 5}
                  y={cy - 5}
                  width={10}
                  height={10}
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={1}
                  transform={`rotate(45 ${cx} ${cy})`}
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={1}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragTarget({ profileId: profile.id, field });
                  }}
                  onDoubleClick={() => onOpenProfileEditor(profile.id)}
                />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  const hasInnerProfiles = profiles.length > 2;
  const start = getMappingBoundary(mapping, profiles[0]?.id ?? null);
  const end = getMappingBoundary(mapping, profiles[profiles.length - 1]?.id ?? null);
  const canRecalculate =
    hasInnerProfiles && start.startPosition != null && start.endPosition != null && end.startPosition != null && end.endPosition != null;

  return (
    <div className="flex w-[720px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold leading-6 text-[#0a0a0a]">{mapping.name || 'Untitled mapping'} — span</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
        >
          ×
        </button>
      </div>

      <ChartFrame
        svgRef={svgRef}
        ariaLabel="Transversal mapping span"
        viewX={viewX}
        viewY={viewY}
        viewW={viewW}
        viewH={viewH}
        zoom={zoom}
        panningPointerId={panningPointerId}
        bgPointerHandlers={bgPointerHandlers}
        onBgDoubleClick={resetView}
        zoomControlProps={zoomControlProps}
        xTicks={xAxis.ticks}
        yTicks={yAxis.ticks}
        xMin={xMin}
        xMax={xMax}
        yMin={Y_MIN}
        yMax={Y_MAX}
        xDecimals={xAxis.decimals}
        yDecimals={yAxis.decimals}
        yUnit=""
        xUnit=""
        className="h-[280px] w-full"
      >
        <g onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
          {renderSeries('startPosition', '#9333ea')}
          {renderSeries('endPosition', '#0d9488')}
        </g>
      </ChartFrame>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#6b7280]">
          Purple = start boundary, teal = end boundary. Diamond = locked to an intersection (double-click to change).
          Drag a circle to adjust; double-click to fine-tune numerically.
        </p>
        <button
          type="button"
          onClick={onRecalculate}
          disabled={!canRecalculate}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Recalculate
        </button>
      </div>
    </div>
  );
}
```

Boundary import cast note: `boundary[field]!` and `boundary[lockKey]` use a non-null assertion
because `points` was already filtered to `boundary[field] != null` above — this is safe, not a
suppressed error; keep it as written, don't widen the filter's type instead (TypeScript can't
narrow through the `.filter()` call automatically here).

- [ ] **Step 3: Wire into `TransversalMappingSection.tsx`**

Replace `onEditStartProfile`/`onEditEndProfile` on `TransversalMappingRow` with:

```tsx
                onEditSpan={() => setSpanChartMappingId(m.id)}
```

Add new state near the existing `boundaryEditor` state:

```ts
  const [spanChartMappingId, setSpanChartMappingId] = useState<string | null>(null);
```

Add the derived covered-profiles list and the mapping being shown in the chart, near
`editingMapping`:

```ts
  const spanChartMapping = spanChartMappingId ? mappings.find((m) => m.id === spanChartMappingId) : undefined;
  const spanChartCoveredProfiles = (() => {
    if (!spanChartMapping || spanChartMapping.startProfileId == null || spanChartMapping.endProfileId == null) return [];
    const sorted = [...crossSectionProfiles].sort((a, b) => a.position - b.position);
    const startIdx = sorted.findIndex((p) => p.id === spanChartMapping.startProfileId);
    const endIdx = sorted.findIndex((p) => p.id === spanChartMapping.endProfileId);
    if (startIdx === -1 || endIdx === -1) return [];
    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    return sorted.slice(lo, hi + 1);
  })();
```

Render the chart near the existing popover render block (right after the closing `</table>`'s
containing `<div>`, alongside the existing `editingMapping && editingProfileId != null && (...)`
block):

```tsx
        {spanChartMapping && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-40">
            <TransversalMappingSpanChart
              mapping={spanChartMapping}
              coveredProfilesSortedByPosition={spanChartCoveredProfiles}
              onChangeBoundary={(profileId, field, position) => updateBoundary(spanChartMapping.id, profileId, { [field]: position })}
              onOpenProfileEditor={(profileId) => setBoundaryEditor({ mappingId: spanChartMapping.id, profileId })}
              onRecalculate={() =>
                setMappings((arr) =>
                  arr.map((m) =>
                    m.id === spanChartMapping.id
                      ? recalculateInnerProfiles(m, spanChartCoveredProfiles, intersectionsData)
                      : m,
                  ),
                )
              }
              onClose={() => setSpanChartMappingId(null)}
            />
          </div>
        )}
```

Add the import:

```ts
import { TransversalMappingSpanChart } from '@/components/composition/TransversalMappingSpanChart';
```

And add `recalculateInnerProfiles` to the existing `@/lib/transversalMapping` import (alongside
`resizeMappingRange` from Task 2).

- [ ] **Step 4: Add the new table header column**

In the `<thead>` of `TransversalMappingSection.tsx`, after the "End profile" `<th>`, add:

```tsx
              <th className="h-8 w-[110px] px-2 text-left font-medium text-[#6b7280]">Span</th>
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx prettier --write src/components/composition/TransversalMappingSpanChart.tsx src/components/composition/TransversalMappingSection.tsx src/components/composition/TransversalMappingRow.tsx
npx prettier --check src/components/composition/TransversalMappingSpanChart.tsx src/components/composition/TransversalMappingSection.tsx src/components/composition/TransversalMappingRow.tsx
npm run build
```
Expected: all clean.

**Manual check:** open a composition's Transversal mapping tab. Add a mapping spanning at least 4
profiles. Click "Edit span" — the chart opens showing one point per covered profile on two lines
(purple start, teal end). Drag a circle point vertically — its position updates live and the line
reshapes. Double-click a point — the existing popover opens for that profile (numeric fields, lock
selector). Set both ends' positions and lock types, then click "Recalculate" — inner profiles not
already locked to a matching landmark should snap to the linearly-interpolated straight line
between the two ends; inner profiles whose lock target matches the two ends' landmark type should
instead show as pinned diamonds at their own matching intersection.

- [ ] **Step 6: Commit**

```bash
git add src/components/composition/TransversalMappingSpanChart.tsx src/components/composition/TransversalMappingSection.tsx src/components/composition/TransversalMappingRow.tsx
git commit -m "Add whole-span chart for editing a transversal mapping across all its profiles

Replaces the per-row start/end pencil buttons with one 'Edit span' button
opening TransversalMappingSpanChart: X = profile spanwise position, Y =
chordwise position, one point per covered profile on two lines (start/end
boundary). Drag adjusts a point directly; double-click opens the existing
per-profile popover for numeric/lock editing. Recalculate re-interpolates
inner profiles via recalculateInnerProfiles (Task 3)."
```

---

### Task 5: Final integration check

**Files:** none (verification only)

- [ ] **Step 1: Full verification sweep**

```bash
npx tsc --noEmit
npm run lint
npm run build
git status --short
```
Expected: `tsc` silent, `lint` 0 errors (pre-existing warnings unrelated to these files are fine),
`build` succeeds, `git status --short` shows a clean tree (everything from Tasks 1–4 committed).

- [ ] **Step 2: Manual regression check**

Open the Transversal mapping tab on a composition with existing saved mappings (hydrated via
`hydrateTransversalMappings`). Confirm:
- Existing mappings still show correct start/end profile selections and names.
- "Edit span" opens the chart with points at the correct positions matching what was previously
  only visible via the old two-popover flow.
- Deleting a mapping, adding a new one, and Save (PUT) still work end-to-end — check the network
  tab shows a `transversal_mapping` payload with `row_index` and resolved `start_locked_to`/
  `end_locked_to` for every covered profile, same shape as before this plan (Task 1/3 didn't
  change the payload's wire shape, only how it's built internally).

Do not use Playwright for this — describe what you checked and stop; the user verifies visually.

- [ ] **Step 3: Report**

No commit for this task (verification only). Summarize what was built and confirmed working.
