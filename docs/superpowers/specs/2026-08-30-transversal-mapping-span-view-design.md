# Transversal mapping: whole-span editing view

## Context

`ARCHITECTURE.md` (repo root) documents a legacy Angular+Konva.js "transversal mapping editor"
this project is not adopting wholesale — it's a reference for behavior/data-model, not an
implementation target (no Konva; this codebase's existing SVG/`ChartFrame` chart infrastructure
is used instead, per explicit decision).

**Current state** (`src/components/composition/TransversalMappingSection.tsx` +
`TransversalMappingRow.tsx` + `TransversalProfileBoundaryPopover.tsx` +
`src/lib/transversalMapping.ts`): a working editor, but a mapping's data model only tracks its
two named boundary profiles (`startProfileBoundary`/`endProfileBoundary`). Every profile between
them is invisible to the user — positions there are linearly interpolated **once, at save time**
(`buildTransversalMappingPayload`), never shown, never independently editable or lockable. Editing
happens one profile at a time via a popover opened from the table row.

**Gap being closed this pass**: give the user one view showing a mapping's boundary across every
profile it touches at once, with live interpolation preview, and let inner-profile boundaries be
dragged/locked independently — matching the reference architecture's per-profile row model
(§3, `ITransversalMappingItemWithKey[]`) instead of the current two-endpoints-only model.

**Explicitly out of scope this pass** (confirmed with the user): concentric offset curves for
overlapping mappings on one profile, spar-line rendering in the per-profile popover, and the
reference's discretized snap-grid (this app's existing continuous nearest-point drag stays as-is).

## Data model change

`hydrateTransversalMappings` (`src/lib/transversalMapping.ts`) already builds a
`byProfileId: Map<number, ProfileBoundary>` covering every profile in the group from the GET
response — it currently discards everything except the min/max-position entries. The fix is to
keep the whole map.

`TransversalMapping` (`src/components/composition/TransversalMappingRow.tsx`) changes from:
```ts
startProfileBoundary: ProfileBoundary;
endProfileBoundary: ProfileBoundary;
```
to:
```ts
/** Every profile from startProfileId to endProfileId (inclusive, by span
 *  position) gets its own boundary — keyed by profile id. */
profileBoundaries: Record<number, ProfileBoundary>;
```
A helper `getMappingBoundary(mapping, profileId): ProfileBoundary` (falls back to
`EMPTY_BOUNDARY`) replaces direct `.startProfileBoundary`/`.endProfileBoundary` access at every
call site (`TransversalMappingSection.tsx`'s `updateBoundary`/popover wiring, `otherRings`
computation, `buildTransversalMappingPayload`).

### Range maintenance

When `startProfileId`/`endProfileId` changes (`TransversalMappingRow`'s profile `SelectField`s),
a new pure function `resizeMappingRange(mapping, profiles): TransversalMapping` in
`transversalMapping.ts`:
- Computes the covered profile range (by position, inclusive).
- Any profile newly in range with no existing boundary entry gets `EMPTY_BOUNDARY` seeded (the
  two ends) or an interpolated one (inner profiles, once both ends have positions — see below).
- Any profile no longer in range has its stale entry pruned from `profileBoundaries` (mirrors the
  reference's range-shrink behavior, §4.6 steps 5–6, without the reference's more elaborate
  clone-row-onto-adjacent-profile machinery, which doesn't apply here since positions aren't
  profile-specific objects with independent identity in this model).

This runs inside `TransversalMappingSection.updateMapping` whenever the patch touches
`startProfileId`/`endProfileId`, before merging into state.

### Interpolation (`recalculateInnerProfiles`)

Ports the reference's §4.6 math as a pure function:
```ts
export function recalculateInnerProfiles(
  mapping: TransversalMapping,
  coveredProfilesSortedByPosition: GeometryProfile[], // start..end inclusive
  intersectionsData: CompositionProfileIntersections[] | undefined,
): TransversalMapping
```
For each of the mapping's two positions (start/end) independently, for every profile strictly
between the first and last covered profile:
- If **both** boundary ends are locked to intersections that are "the same landmark" — this
  codebase's `CompositionIntersection` has `type: 'edge' | 'mapping'` plus nullable `spar_id`/
  `longitudinal_mapping_id`/`index`/`side` (not the reference's dedicated `type: 'spar'`), so
  "same landmark" is: same `type`, same `spar_id`, same `longitudinal_mapping_id`, same `index`,
  same `side`, and — only when both `spar_id`/`longitudinal_mapping_id` are null (a bare profile
  edge) — same TE-vs-LE-ness (`position === 0` on both, or neither). New helper
  `isSameLandmark(a, b)` in `transversalMapping.ts`.
- If a same-landmark intersection exists on this inner profile too, lock the inner boundary to it
  (position read from that intersection, `lockedTo` set to its id).
- Otherwise, linearly interpolate by **span position** (not array index) between the two ends —
  the exact formula already inline in `buildTransversalMappingPayload` today, extracted into this
  function; `lockedTo: null`.

Exposed as an explicit **"Recalculate"** button on the new chart (not run automatically on every
edit — a manually-dragged inner point should stay put until the user asks to re-snap it, same as
the reference).

`buildTransversalMappingPayload` simplifies: positions are already known per profile in
`profileBoundaries`, so it becomes a straight flatten (still resolves `lockedTo: null` to nearest
intersection via the existing `findNearestIntersectionId`, since a fully free-dragged point still
needs *some* locked-to id for the backend's write shape) — no more inline interpolation.

## New component: `TransversalMappingSpanChart.tsx`

`src/components/composition/TransversalMappingSpanChart.tsx`. Renders inside
`TransversalMappingSection.tsx`, replacing the current per-row "edit start/end profile" pencil
buttons' destination — a mapping's row gets a single "Edit span" action opening this chart instead
of picking a side first.

- X axis: covered profiles' real `position` (spanwise coordinate) — not array index, so spacing
  reflects actual geometry, matching the reference's interpolate-by-position convention.
- Y axis: chordwise position, 0–1.
- Two point series (start boundary, end boundary), one point per covered profile, connected by a
  `<polyline>` per series — since inner points are either locked (pinned) or linearly interpolated
  by construction, the line *is* the live interpolation preview, no separate preview needed.
- Reuses `ChartFrame`/`dataToPx`/`pxToData`/`useChartZoomPan` (existing chart infra) for the
  frame, axes, zoom/pan — **not** `CurveEditor`, since points are 1:1 with existing profiles
  (no insert/delete-point interaction; that only happens via the row's start/end profile
  pickers, which grow/shrink the covered range).
- New minimal drag interaction (not `useCurveEditorInteractions` — different semantics): a point
  whose boundary is unlocked is a small filled circle, vertically draggable (pointerdown → track
  → `pxToData` → clamp 0–1 → call `onChangeBoundary(profileId, side, position)`); a locked point
  renders as a distinct pinned marker, not draggable.
- **Double-clicking** any point (locked or not) opens the existing
  `TransversalProfileBoundaryPopover` for that profile — unchanged component, just re-wired to
  open from a chart point instead of a table pencil button. This is where lock-target selection
  and precise numeric entry keep living; the chart's own single-pointer drag is for quick visual
  adjustment only. Double-click (`onDoubleClick`) is a plain, unambiguous second gesture that
  doesn't need disambiguating against drag's `pointerdown`/`pointermove`/`pointerup` — same idiom
  `CurveEditor` already uses for a different distinct action (double-click a point to delete it).
- "Recalculate" button (visible whenever start/end profile positions exist and there's at least
  one inner profile — mirrors the reference's `isRecalculateButtonVisible`) calls
  `recalculateInnerProfiles` and replaces the mapping in state.

## Files touched

| File | Change |
|---|---|
| `src/components/composition/TransversalMappingRow.tsx` | `profileBoundaries: Record<number, ProfileBoundary>` replaces the two named-boundary fields; add `getMappingBoundary` helper |
| `src/lib/transversalMapping.ts` | `hydrateTransversalMappings` keeps the full per-profile map; add `resizeMappingRange`, `recalculateInnerProfiles`, `isSameLandmark`; simplify `buildTransversalMappingPayload` |
| `src/components/composition/TransversalMappingSpanChart.tsx` | new |
| `src/components/composition/TransversalMappingSection.tsx` | owns `profileBoundaries`-shaped state, wires range-resize on profile-select change, renders the new chart instead of the old per-side pencil-button flow, still opens `TransversalProfileBoundaryPopover` from a chart point |
| `src/components/composition/TransversalProfileBoundaryPopover.tsx` | unchanged internals; caller wiring only |

## Testing

No test infra in this repo (per `CodingConventions.md`) — verified via `tsc`/`lint`/`build` plus
manual check in the browser (self-checked by the user, not driven by the agent).

## Out of scope / explicit non-goals this pass

- Concentric offset curves for overlapping mappings on one profile.
- Spar-line rendering in `TransversalProfileBoundaryPopover`.
- Discretized snap-grid (reference §5.7) — dragging stays continuous, matching existing
  `arcFractionNearestTo` convention.
- Surfacing `read_only` mappings distinctly in the UI (present in the GET response, currently
  unused frontend-side; unrelated to this pass's gap).
