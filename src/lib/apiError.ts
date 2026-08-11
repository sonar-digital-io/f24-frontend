import { isAxiosError } from 'axios';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Extracts a human-readable message from a failed API call, preferring
 * whatever the backend itself reported — DRF's `detail`/`message`, or the
 * first field-validation error — over the generic fallback.
 */
export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data;
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
  return FALLBACK_MESSAGE;
}
