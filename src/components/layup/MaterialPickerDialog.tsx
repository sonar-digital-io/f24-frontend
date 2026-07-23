import { TablePickerDialog, type TablePickerColumn } from '@/components/common/dialog/TablePickerDialog';
import { MATERIALS, type Material } from '@/data/materials';

interface MaterialPickerDialogProps {
  open: boolean;
  currentMaterialName?: string | null;
  onSelect: (materialName: string) => void;
  onClose: () => void;
}

const COLUMNS: TablePickerColumn<Material>[] = [
  { key: 'name', label: 'Name', widthClassName: 'w-[220px]', sortValue: (m) => m.name, render: (m) => m.name },
  { key: 'type', label: 'Type', widthClassName: 'w-[160px]', sortValue: (m) => m.type, render: (m) => m.type },
  { key: 'description', label: 'Description', render: (m) => m.description },
  {
    key: 'lastUpdated',
    label: 'Last updated',
    widthClassName: 'w-[140px] whitespace-nowrap',
    sortValue: (m) => m.lastUpdated,
    render: (m) => m.lastUpdated,
  },
];

export function MaterialPickerDialog({
  open,
  currentMaterialName,
  onSelect,
  onClose,
}: MaterialPickerDialogProps) {
  return (
    <TablePickerDialog
      open={open}
      titleId="material-picker-title"
      title="Materials"
      items={MATERIALS}
      getId={(m) => m.name}
      currentId={currentMaterialName}
      onSelect={onSelect}
      onClose={onClose}
      searchPlaceholder="Search by name, type or description"
      searchPredicate={(m, q) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      }
      columns={COLUMNS}
      emptyMessage="No materials match your search."
    />
  );
}
