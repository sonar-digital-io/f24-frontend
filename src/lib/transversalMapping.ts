import type {
  CompositionIntersection,
  CompositionMappingTransversalResponse,
  CompositionMappingTransversalWritePayload,
  CompositionProfileIntersections,
} from '@/api/types/composition';
import type { GeometryProfile } from '@/api/types/geometry';
import type { ProfileBoundary, TransversalMapping } from '@/components/composition/TransversalMappingRow';

/** "Start/end locked to" describes what an intersection point actually is —
 *  either a profile edge (leading/trailing) or a specific longitudinal
 *  mapping's boundary. */
export function describeIntersection(entry: CompositionIntersection | undefined): string {
  if (!entry) return '—';
  if (entry.type === 'edge') return entry.position < 0.5 ? 'Trailing edge' : 'Leading edge';
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
  const byProfile = new Map<number, CompositionMappingTransversalWritePayload['transversal_mapping'][number]['mappings']>();
  profiles.forEach((p) => byProfile.set(p.id, []));

  let incomplete = 0;
  mappings.forEach((m, rowIndex) => {
    const { startProfileId, endProfileId, startProfileBoundary: sb, endProfileBoundary: eb } = m;
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
    const [loProfile, hiProfile] = startIdx <= endIdx ? [startProfileId, endProfileId] : [endProfileId, startProfileId];
    const [loBoundary, hiBoundary] = startIdx <= endIdx ? [sb, eb] : [eb, sb];
    const covered = sortedProfiles.slice(loIdx, hiIdx + 1);
    const spanRange = (sortedProfiles[hiIdx].position - sortedProfiles[loIdx].position) || 1;

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
    if (!resolvedAny) incomplete += 1;
  });

  return {
    payload: { transversal_mapping: profiles.map((p) => ({ profile_id: p.id, mappings: byProfile.get(p.id) ?? [] })) },
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
  const groups = new Map<string, { name: string; layup: number; byProfileId: Map<number, ProfileBoundary> }>();
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
      startProfileBoundary: g.byProfileId.get(startProfileId)!,
      endProfileBoundary: g.byProfileId.get(endProfileId)!,
    };
  });
}
