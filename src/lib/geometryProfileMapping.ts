import { API_TO_UI_PROFILE_TYPE, UI_TO_API_PROFILE_TYPE, type Profile } from '@/data/profiles';
import type { GeometryProfile, GeometryProfileInput } from '@/api/types/geometry';

export function toUiProfile(p: GeometryProfile): Profile {
  const params = new Map(p.parameters.map((kv) => [kv.reference, kv.value]));
  return {
    id: String(p.id),
    name: p.name,
    position: p.position,
    type: API_TO_UI_PROFILE_TYPE[p.type] ?? p.type,
    maxCamber: Number(params.get('max_camber') ?? 0),
    maxCamberPosition: Number(params.get('max_camber_position') ?? 0),
    thickness: Number(params.get('max_thickness') ?? 0),
    show2D: true,
  };
}

export function toApiProfile(p: Profile): GeometryProfileInput {
  return {
    name: p.name,
    position: p.position,
    type: UI_TO_API_PROFILE_TYPE[p.type] ?? p.type,
    parameters: [
      { reference: 'max_camber', value: String(p.maxCamber) },
      { reference: 'max_camber_position', value: String(p.maxCamberPosition) },
      { reference: 'max_thickness', value: String(p.thickness) },
    ],
  };
}
