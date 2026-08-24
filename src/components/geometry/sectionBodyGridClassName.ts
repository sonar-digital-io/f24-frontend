/** Chart+table layout shared by `ProfileDistributionSectionBody` and
 *  `StackingSectionBody`: stacked while folded, side-by-side once expanded. */
export function sectionBodyGridClassName(folded: boolean): string {
  return folded ? 'flex flex-col gap-4' : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,384px)]';
}
