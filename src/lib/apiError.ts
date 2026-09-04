import { isAxiosError } from 'axios';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

interface ReferenceConflictLayer {
  id: string;
  name: string;
}

interface ReferenceConflictLayup {
  id: string;
  name: string;
  layers?: ReferenceConflictLayer[];
}

interface ReferenceConflictComposition {
  id: string;
  name: string;
  core_material?: boolean;
  layup?: ReferenceConflictLayup[];
}

/** 409 delete-conflict body: a material/geometry still referenced by one or more
 *  compositions (as a core material, or via a layup's layer) can't be deleted. */
interface ReferenceConflictBody {
  compositions?: ReferenceConflictComposition[];
}

/** "In use by composition "X" (layup "Y": layer "Z"), composition "W"." — or
 *  undefined if `data` doesn't look like this conflict shape. */
function formatReferenceConflict(data: Record<string, unknown>): string | undefined {
  const compositions = (data as ReferenceConflictBody).compositions;
  if (!Array.isArray(compositions) || compositions.length === 0) return undefined;
  const parts = compositions.map((c) => {
    const layupNames = (c.layup ?? [])
      .map((l) => {
        const layerNames = (l.layers ?? []).map((layer) => layer.name).filter(Boolean);
        return layerNames.length > 0 ? `layup "${l.name}" (layer "${layerNames.join('", "')}")` : `layup "${l.name}"`;
      })
      .join(', ');
    const detail = layupNames || (c.core_material ? 'core material' : undefined);
    return detail ? `composition "${c.name}" (${detail})` : `composition "${c.name}"`;
  });
  return `Still in use by ${parts.join(', ')} — remove it there first.`;
}

/**
 * Extracts a human-readable message from a failed API call, preferring
 * whatever the backend itself reported — DRF's `detail`/`message`, a
 * structured delete-conflict (409) body, or the first field-validation error —
 * over the generic fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (isAxiosError(error)) {
    let data: unknown = error.response?.data;
    // A request made with `responseType: 'arraybuffer'` (e.g. binary mesh
    // downloads) still decodes a JSON/text error body to raw bytes — decode
    // it back to text/JSON so the backend's own message isn't lost.
    if (data instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(data);
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.detail === 'string' && obj.detail.trim()) return obj.detail;
      if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
      if (error.response?.status === 409) {
        const conflictMessage = formatReferenceConflict(obj);
        if (conflictMessage) return conflictMessage;
      }
      // DRF field-validation errors: { field: ["message", ...], ... }
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && value.trim()) return value;
        if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0];
      }
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
