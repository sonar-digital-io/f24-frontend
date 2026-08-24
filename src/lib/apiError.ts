import { isAxiosError } from 'axios';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Extracts a human-readable message from a failed API call, preferring
 * whatever the backend itself reported — DRF's `detail`/`message`, or the
 * first field-validation error — over the generic fallback.
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
