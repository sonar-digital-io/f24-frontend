import type {
  CompositionIntersection,
  CompositionMappingTransversalResponse,
  CompositionMappingTransversalWritePayload,
} from '@/api/types/composition';
import type { GeometryProfile } from '@/api/types/geometry';
import type {
  ProfileBoundary,
  TransversalMapping,
} from '@/components/composition/TransversalMappingRow';
import { EMPTY_BOUNDARY, getMappingBoundary } from '@/components/composition/TransversalMappingRow';
import { sideOfPosition } from '@/lib/profileGeometry';
import { round6 } from '@/lib/bezierMath';

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

/**
 * The effective value for one profile's boundary field: its own explicitly-
 * set value if it has one, otherwise linearly interpolated (by real span
 * position, not array index) between the nearest COVERED profiles on either
 * side that DO have an explicit value for this field — not always the two
 * endpoint profiles. Falls back to whichever single side has a value if
 * only one side does. Returns null if no covered profile has this field set
 * at all.
 *
 * Rounded to 6 decimals — the precision the backend itself stores/returns
 * start_position/end_position at — so a linear interpolation's floating-point
 * noise never leaks into what's displayed (the Cross-section view's rings,
 * the profile modal's table) or sent.
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
  if (own != null) return round6(own);
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
    if (after.position === before.position) return round6(before.value);
    const t = (target.position - before.position) / (after.position - before.position);
    return round6(before.value + (after.value - before.value) * t);
  }
  return before?.value != null ? round6(before.value) : after?.value != null ? round6(after.value) : null;
}

/**
 * Whether a mapping's start (or end, checked independently) boundary lands on
 * both sides — upper and lower surface, split at each profile's own real
 * trailing/leading edge, not a fixed 0.5 (see lib/profileGeometry) — across
 * its covered profiles. Start and end are NOT compared against each other
 * here: a mapping's start and end are expected to sit on different sides of
 * the SAME profile (that's the normal shape of a chordwise band); what the
 * backend actually rejects is the START side drifting between profiles (or,
 * separately, the END side doing so). Checked client-side first — with the
 * group's real effective position per profile, the same value
 * `buildTransversalMappingPayload` would actually send — instead of only
 * finding out from its error response.
 */
export function getMappingSideIssues(
  mapping: TransversalMapping,
  coveredProfilesSortedByPosition: GeometryProfile[],
  edgePositionsByProfileId: Map<number, number[]>,
): { startMismatch: boolean; endMismatch: boolean } {
  function mismatch(field: 'startPosition' | 'endPosition'): boolean {
    let side: boolean | null = null;
    for (const p of coveredProfilesSortedByPosition) {
      const v = effectiveBoundaryValue(
        coveredProfilesSortedByPosition,
        mapping.profileBoundaries,
        p.id,
        field,
      );
      if (v == null) continue;
      const edges = edgePositionsByProfileId.get(p.id) ?? [];
      if (edges.length !== 2) continue; // this profile's own edges unknown — nothing to compare
      const thisSide = sideOfPosition(v, edges[0], edges[1]);
      if (side == null) side = thisSide;
      else if (thisSide !== side) return true;
    }
    return false;
  }
  return { startMismatch: mismatch('startPosition'), endMismatch: mismatch('endPosition') };
}

/**
 * Builds the PUT payload from the editable rows. Each row explicitly
 * specifies its start profile's and end profile's own boundary (position +
 * optional locked-to); the backend also rejects "discontinuous" mappings, so
 * every profile *between* start and end (by position) gets an entry too,
 * with its position linearly interpolated. `start_locked_to`/`end_locked_to`
 * are only ever a profile's own explicitly-locked value (or null) — never
 * invented from the nearest intersection — since the backend needs the raw
 * `start_position`/`end_position` fraction for a genuinely unlocked boundary,
 * not a guessed lock. Rows missing a profile/layup/position are dropped and
 * counted in `incomplete`.
 */
export function buildTransversalMappingPayload(
  mappings: TransversalMapping[],
  profiles: GeometryProfile[],
  edgePositionsByProfileId: Map<number, number[]>,
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
    // A row added via "Add transversal mapping" and never touched (no
    // layup, no profiles picked) isn't a mistake worth warning about — it's
    // just an unused blank row, silently dropped from the payload.
    const isUntouched = !m.layupId && startProfileId == null && endProfileId == null;
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
      if (!isUntouched) incomplete += 1;
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

    // The backend rejects the whole group if its start positions (or,
    // separately, its end positions) drift between the upper and lower side
    // across covered profiles — don't send it at all.
    const { startMismatch, endMismatch } = getMappingSideIssues(m, covered, edgePositionsByProfileId);
    if (startMismatch || endMismatch) {
      incomplete += 1;
      return;
    }

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
      const arr = byProfile.get(profile.id);
      if (boundary.startPosition == null || boundary.endPosition == null || !arr) return;
      resolvedAny = true;
      arr.push({
        name: m.name,
        group_id: m.groupId,
        layup: Number(m.layupId),
        row_index: rowIndex,
        start_locked_to: boundary.startLockedTo,
        end_locked_to: boundary.endLockedTo,
        start_position: boundary.startPosition,
        end_position: boundary.endPosition,
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
 *  profile's own entry directly for its boundary fields. `layupMappingNames`
 *  (the composition's own longitudinal/layup mapping names) excludes any
 *  group that isn't really a transversal mapping — the backend also returns
 *  each layup mapping's own boundary reflected into this same per-profile
 *  shape (so the cross-section view has something to draw before any real
 *  transversal mapping exists); a transversal mapping can never share a
 *  layup mapping's name, so a group with one is always that reflection, not
 *  a saved transversal mapping row, and must not be hydrated as an editable
 *  one. */
export function hydrateTransversalMappings(
  transversalMappingData: CompositionMappingTransversalResponse,
  profiles: GeometryProfile[],
  layupMappingNames: Set<string>,
): TransversalMapping[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const groups = new Map<
    string,
    { name: string; layup: number; byProfileId: Map<number, ProfileBoundary> }
  >();
  transversalMappingData.transversal_mapping.forEach((p) => {
    p.mappings.forEach((entry) => {
      if (layupMappingNames.has(entry.name.trim())) return;
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
