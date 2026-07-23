import { TablePickerDialog, type TablePickerColumn } from '@/components/common/dialog/TablePickerDialog';
import { LAYUPS, type Layup } from '@/data/layups';

interface LayupPickerDialogProps {
  open: boolean;
  currentLayupId?: string | null;
  onSelect: (layupId: string) => void;
  onClose: () => void;
}

const COLUMNS: TablePickerColumn<Layup>[] = [
  { key: 'name', label: 'Name', widthClassName: 'w-[240px]', sortValue: (l) => l.name, render: (l) => l.name },
  { key: 'description', label: 'Description', render: (l) => l.description },
  {
    key: 'lastUpdated',
    label: 'Last updated',
    widthClassName: 'w-[160px] whitespace-nowrap',
    sortValue: (l) => l.lastUpdated,
    render: (l) => l.lastUpdated,
  },
];

/**
 * Layup chooser dialog: full-table picker over the existing LAYUPS list.
 * Triggered from the Layup mapping table's per-row "Select" button — replaces
 * a plain dropdown when users need search/sort/pagination over the layup
 * catalog. Confirms selection by clicking "Select" on a row.
 *
 * Pattern matches NewGeometryModal: fixed overlay, click-outside + ESC close,
 * body scroll-lock.
 */
export function LayupPickerDialog({
  open,
  currentLayupId,
  onSelect,
  onClose,
}: LayupPickerDialogProps) {
  return (
    <TablePickerDialog
      open={open}
      titleId="layup-picker-title"
      title="Layups"
      items={LAYUPS}
      getId={(l) => l.id}
      currentId={currentLayupId}
      onSelect={onSelect}
      onClose={onClose}
      searchPlaceholder="Search for a layup"
      searchPredicate={(l, q) =>
        l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      }
      columns={COLUMNS}
      emptyMessage="No layups match your search."
    />
  );
}
