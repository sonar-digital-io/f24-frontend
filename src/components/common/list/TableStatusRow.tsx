import type { ReactNode } from 'react';

interface TableStatusRowProps {
  colSpan: number;
  variant?: 'muted' | 'error';
  children: ReactNode;
}

/** A full-width `<tr>` for a table's loading/error/empty state. */
export function TableStatusRow({ colSpan, variant = 'muted', children }: TableStatusRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`px-3 py-10 text-center text-[14px] ${variant === 'error' ? 'text-[#dc2626]' : 'text-[#6b7280]'}`}
      >
        {children}
      </td>
    </tr>
  );
}
