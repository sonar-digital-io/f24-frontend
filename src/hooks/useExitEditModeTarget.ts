import { useLocation } from 'react-router-dom';

/** Where "Exit edit mode" should navigate to — the page the user arrived from
 *  (e.g. Home's "Recently edited" list), falling back to the entity's own list
 *  page when there's no such origin (e.g. direct URL load, or arriving from
 *  that list page already). */
export function useExitEditModeTarget(fallback: string): string {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return state?.from ?? fallback;
}
