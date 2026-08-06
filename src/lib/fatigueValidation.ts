import type { FatigueCase, FatigueProfile } from '@/api/types/loadGroups';

export type FatigueCaseErrors = Partial<Record<keyof FatigueCase, string>>;

export function validateFatigueCase(fc: FatigueCase): FatigueCaseErrors {
  const errors: FatigueCaseErrors = {};

  if (!fc.name.trim()) errors.name = 'Required.';
  if (fc.load_case == null) errors.load_case = 'Required.';

  if (!(fc.min_scale > 0)) errors.min_scale = 'Must be > 0.';
  if (!(fc.max_scale <= 100)) errors.max_scale = 'Must be ≤ 100.';
  if (fc.min_scale > 0 && fc.max_scale <= 100 && !(fc.min_scale <= fc.max_scale)) {
    errors.min_scale = 'Must be ≤ max scale.';
    errors.max_scale = 'Must be ≥ min scale.';
  }

  if (fc.time !== null && fc.cycles !== null) {
    errors.time = 'Time and cycles can’t both be set.';
    errors.cycles = 'Time and cycles can’t both be set.';
  } else if (fc.time === null && fc.cycles === null) {
    errors.time = 'Either time or cycles is required.';
    errors.cycles = 'Either time or cycles is required.';
  }

  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined)) as FatigueCaseErrors;
}

export function fatigueCaseHasErrors(fc: FatigueCase): boolean {
  return Object.keys(validateFatigueCase(fc)).length > 0;
}

export function fatigueProfileHasErrors(profile: FatigueProfile): boolean {
  return !profile.name.trim() || profile.fatigue_cases.some(fatigueCaseHasErrors);
}

export function fatigueProfilesHaveErrors(profiles: FatigueProfile[]): boolean {
  return profiles.some(fatigueProfileHasErrors);
}
