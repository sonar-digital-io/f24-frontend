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
