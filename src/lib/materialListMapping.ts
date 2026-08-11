import type { Material } from '@/data/materials';
import type { Material as BackendMaterial } from '@/api/types/materials';

export function toUiMaterial(m: BackendMaterial): Material {
  return {
    id: String(m.id),
    name: m.name,
    type: m.type,
    description: m.description ?? '',
    lastUpdated: m.last_modified,
  };
}

export function formatDateLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const s = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${s}, ${d.getFullYear()}`;
}

export function parseLastUpdated(s: string): Date | null {
  const vMatch = s.match(/^v(\d{4})\/(\d{2})$/);
  if (vMatch) return new Date(`${vMatch[1]}-${vMatch[2]}-01T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  // Backend datetimes arrive as "...T...Z" or the space-separated "... ...+00:00" variant.
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}
