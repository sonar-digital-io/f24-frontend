/** "coef_therm_exp_11" -> "Coef Therm Exp 11"; "woven ply" -> "Woven Ply" — capitalizes
 *  each underscore- or space-separated word without touching existing uppercase letters,
 *  so acronyms like "UD" stay intact. */
export function toTitleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
