import type { ReactNode } from 'react';

interface ListTableBodyProps<T> {
  colSpan: number;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  rows: T[];
  renderRow: (item: T) => ReactNode;
  emptyLabel: ReactNode;
}

/** `<tbody>` loading/error/rows/empty-state wrapper shared by every list page's
 *  table — the row markup itself (`renderRow`) still varies per page. */
export function ListTableBody<T>({
  colSpan,
  isLoading,
  isError,
  loadingLabel,
  errorLabel,
  rows,
  renderRow,
  emptyLabel,
}: ListTableBodyProps<T>) {
  return (
    <tbody>
      {isLoading && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
            {loadingLabel}
          </td>
        </tr>
      )}
      {isError && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-8 text-center text-[14px] text-[#dc2626]">
            {errorLabel}
          </td>
        </tr>
      )}
      {!isLoading && !isError && rows.map(renderRow)}
      {!isLoading && !isError && rows.length === 0 && (
        <tr>
          <td colSpan={colSpan} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
            {emptyLabel}
          </td>
        </tr>
      )}
    </tbody>
  );
}
