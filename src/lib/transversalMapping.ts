import type {
  CompositionIntersection,
  CompositionMappingTransversalResponse,
  CompositionMappingTransversalWritePayload,
  CompositionProfileIntersections,
} from '@/api/types/composition';
import type { GeometryProfile } from '@/api/types/geometry';
import type {
  ProfileBoundary,
  TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import { EMPTY_BOUNDARY, getMappingBoundary } from '@/components/composition/TransversalMappingRow';

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
  // Anything in mapping.profileBoundaries not in `covered` is pruned by
  // simply not copying it into `next` below.

  const next: Record<number, ProfileBoundary> = {};
  covered.forEach((p) => {
    next[p.id] = mapping.profileBoundaries[p.id] ?? EMPTY_BOUNDARY;
  });

  return { ...mapping, profileBoundaries: next };
}

/** A profile's own two edge intersections are the trailing edge (near
 *  position 0) and the leading edge (near position 0.5, since arc length
 *  is measured from the trailing edge around one side and back). */
function isTrailingEdge(position: number): boolean {
  return position < 0.5;
}

/** "Start/end locked to" describes what an intersection point actually is —
 *  either a profile edge (leading/trailing) or a specific longitudinal
 *  mapping's boundary. */
export function describeIntersection(entry: CompositionIntersection | undefined): string {
  if (!entry) return '—';
  if (entry.type === 'edge')
    return isTrailingEdge(entry.position) ? 'Trailing edge' : 'Leading edge';
  const name = entry.longitudinal_mapping_name ?? 'Mapping';
  return entry.side ? `${name} (${entry.side})` : name;
}

/** The profile's own intersection whose perimeter fraction is closest to
 *  `position` — used both as the "Unlocked" fallback and to fill in every
 *  profile between the row's explicit start/end profile (the backend
 *  rejects "discontinuous" mappings that skip profiles in that range). */
function findNearestIntersectionId(
  profileId: number,
  position: number,
  intersectionsData: CompositionProfileIntersections[] | undefined,
): number | null {
  const list = intersectionsData?.find((p) => p.profile_id === profileId)?.intersections ?? [];
  if (list.length === 0) return null;
  let best = list[0];
  let bestDist = Math.abs(best.position - position);
  for (const i of list) {
    const d = Math.abs(i.position - position);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best.id;
}

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
 * null) — they're both the trailing edge or both the leading edge (see
 * `isTrailingEdge`: a near-0 position is the trailing edge; a profile has
 * exactly one other edge intersection, the leading edge, near 0.5).
 */
export function isSameLandmark(a: CompositionIntersection, b: CompositionIntersection): boolean {
  if (a.type !== b.type) return false;
  if (a.spar_id !== b.spar_id) return false;
  if (a.longitudinal_mapping_id !== b.longitudinal_mapping_id) return false;
  if (a.index !== b.index) return false;
  if (a.side !== b.side) return false;
  if (a.spar_id == null && a.longitudinal_mapping_id == null) {
    return isTrailingEdge(a.position) === isTrailingEdge(b.position);
  }
  return true;
}

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
      firstLandmark && lastLandmark && isSameLandmark(firstLandmark, lastLandmark)
        ? firstLandmark
        : null;

    coveredProfilesSortedByPosition.slice(1, -1).forEach((profile) => {
      const current = next[profile.id] ?? { ...EMPTY_BOUNDARY };
      const equivalentLandmark = sameLandmarkLock
        ? findLandmarkOnProfile(profile.id, sameLandmarkLock, intersectionsData)
        : null;
      if (equivalentLandmark) {
        next[profile.id] = {
          ...current,
          [posKey]: equivalentLandmark.position,
          [lockKey]: equivalentLandmark.id,
        };
        return;
      }
      const t = (profile.position - first.position) / spanRange;
      const interpolated = firstPos + (lastPos - firstPos) * t;
      next[profile.id] = { ...current, [posKey]: interpolated, [lockKey]: null };
    });
  });

  return { ...mapping, profileBoundaries: next };
}

function resolveLockedTo(
  profileId: number,
  lockedTo: number | null,
  position: number | null,
  intersectionsData: CompositionProfileIntersections[] | undefined,
): number | null {
  if (lockedTo != null) return lockedTo;
  if (position == null) return null;
  return findNearestIntersectionId(profileId, position, intersectionsData);
}

/**
 * The effective value for one profile's boundary field: its own explicitly-
 * set value if it has one, otherwise linearly interpolated (by real span
 * position, not array index) between the nearest COVERED profiles on either
 * side that DO have an explicit value for this field — not always the two
 * endpoint profiles. Falls back to whichever single side has a value if
 * only one side does. Returns null if no covered profile has this field set
 * at all.
 *
 * Used by both buildTransversalMappingPayload (so save reflects exactly
 * what a user actually set, not just the two endpoints) and
 * TransversalMappingSpanChart (so the chart's preview matches what save
 * will actually write).
 */
export function effectiveBoundaryValue(
  coveredProfilesSortedByPosition: GeometryProfile[],
  profileBoundaries: Record<number, ProfileBoundary>,
  profileId: number,
  field: 'startPosition' | 'endPosition',
): number | null {
  const own = profileBoundaries[profileId]?.[field];
  if (own != null) return own;
  const target = coveredProfilesSortedByPosition.find((p) => p.id === profileId);
  if (!target) return null;

  let before: { position: number; value: number } | null = null;
  let after: { position: number; value: number } | null = null;
  for (const p of coveredProfilesSortedByPosition) {
    const v = profileBoundaries[p.id]?.[field];
    if (v == null) continue;
    if (p.position <= target.position && (!before || p.position > before.position)) {
      before = { position: p.position, value: v };
    }
    if (p.position >= target.position && (!after || p.position < after.position)) {
      after = { position: p.position, value: v };
    }
  }
  if (before && after) {
    if (after.position === before.position) return before.value;
    const t = (target.position - before.position) / (after.position - before.position);
    return before.value + (after.value - before.value) * t;
  }
  return before?.value ?? after?.value ?? null;
}

/**
 * Builds the PUT payload from the editable rows. Each row explicitly
 * specifies its start profile's and end profile's own boundary (position +
 * optional locked-to); the backend also rejects "discontinuous" mappings, so
 * every profile *between* start and end (by position) gets an entry too,
 * with its position linearly interpolated and snapped to its own nearest
 * intersection. Rows missing a profile/layup/position are dropped and
 * counted in `incomplete`.
 */
export function buildTransversalMappingPayload(
  mappings: TransversalMapping[],
  profiles: GeometryProfile[],
  intersectionsData: CompositionProfileIntersections[] | undefined,
): { payload: CompositionMappingTransversalWritePayload; incomplete: number } {
  const sortedProfiles = [...profiles].sort((a, b) => a.position - b.position);
  const byProfile = new Map<
    number,
    CompositionMappingTransversalWritePayload['transversal_mapping'][number]['mappings']
  >();
  profiles.forEach((p) => byProfile.set(p.id, []));

  let incomplete = 0;
  mappings.forEach((m, rowIndex) => {
    const { startProfileId, endProfileId } = m;
    const sb = getMappingBoundary(m, startProfileId);
    const eb = getMappingBoundary(m, endProfileId);
    if (
      !m.layupId ||
      startProfileId == null ||
      endProfileId == null ||
      sb.startPosition == null ||
      sb.endPosition == null ||
      eb.startPosition == null ||
      eb.endPosition == null
    ) {
      incomplete += 1;
      return;
    }
    const startIdx = sortedProfiles.findIndex((p) => p.id === startProfileId);
    const endIdx = sortedProfiles.findIndex((p) => p.id === endProfileId);
    if (startIdx === -1 || endIdx === -1) {
      incomplete += 1;
      return;
    }
    const [loIdx, hiIdx] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const covered = sortedProfiles.slice(loIdx, hiIdx + 1);

    let resolvedAny = false;
    covered.forEach((profile) => {
      // Prefer this profile's own explicitly-set boundary (drag, lock
      // selection, or a previous Recalculate); otherwise interpolate between
      // the nearest covered profiles that DO have an explicit value — so a
      // dragged inner profile is honoured, not overwritten by an
      // endpoint-to-endpoint lerp.
      const own = getMappingBoundary(m, profile.id);
      const boundary: ProfileBoundary = {
        startPosition: effectiveBoundaryValue(
          covered,
          m.profileBoundaries,
          profile.id,
          'startPosition',
        ),
        startLockedTo: own.startLockedTo,
        endPosition: effectiveBoundaryValue(
          covered,
          m.profileBoundaries,
          profile.id,
          'endPosition',
        ),
        endLockedTo: own.endLockedTo,
      };
      const startLockedTo = resolveLockedTo(
        profile.id,
        boundary.startLockedTo,
        boundary.startPosition,
        intersectionsData,
      );
      const endLockedTo = resolveLockedTo(
        profile.id,
        boundary.endLockedTo,
        boundary.endPosition,
        intersectionsData,
      );
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
    if (!resolvedAny) incomplete += 1;
  });

  return {
    payload: {
      transversal_mapping: profiles.map((p) => ({
        profile_id: p.id,
        mappings: byProfile.get(p.id) ?? [],
      })),
    },
    incomplete,
  };
}

/** Inverse of `buildTransversalMappingPayload` — regroups the GET response's
 *  per-profile entries back into editable rows by `group_id`, taking the
 *  lowest/highest-position covered profile as start/end and reading that
 *  profile's own entry directly for its boundary fields. */
export function hydrateTransversalMappings(
  transversalMappingData: CompositionMappingTransversalResponse,
  profiles: GeometryProfile[],
): TransversalMapping[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const groups = new Map<
    string,
    { name: string; layup: number; byProfileId: Map<number, ProfileBoundary> }
  >();
  transversalMappingData.transversal_mapping.forEach((p) => {
    p.mappings.forEach((entry) => {
      const boundary: ProfileBoundary = {
        startPosition: entry.start_position,
        startLockedTo: entry.start_locked_to,
        endPosition: entry.end_position,
        endLockedTo: entry.end_locked_to,
      };
      const existing = groups.get(entry.group_id);
      if (existing) {
        existing.byProfileId.set(p.profile_id, boundary);
      } else {
        groups.set(entry.group_id, {
          name: entry.name,
          layup: entry.layup,
          byProfileId: new Map([[p.profile_id, boundary]]),
        });
      }
    });
  });

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
}
