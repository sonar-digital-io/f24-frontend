import { TablePickerDialog, type TablePickerColumn } from '@/components/common/dialog/TablePickerDialog';
import { useCompositionDetail } from '@/hooks/api/useComposition';
import type { CompositionLayupDetail } from '@/api/types/composition';

interface LayupPickerDialogProps {
  compositionId: number;
  open: boolean;
  currentLayupId?: string | null;
  onSelect: (layupId: string) => void;
  onClose: () => void;
}

const COLUMNS: TablePickerColumn<CompositionLayupDetail>[] = [
  { key: 'name', label: 'Name', widthClassName: 'w-[240px]', sortValue: (l) => l.name, render: (l) => l.name },
  {
    key: 'layers',
    label: 'Layers',
    widthClassName: 'w-[120px]',
    sortValue: (l) => String(l.layers.length),
    render: (l) => l.layers.length,
  },
];

/**
 * Layup chooser dialog: picks from this composition's own saved layups —
 * inline on the composition detail response (no separate layup GET
 * endpoint). Selection is keyed by the layup's backend id (needed later to
 * save a mapping's `layup` reference as a number). Confirms by clicking "Select".
 */
export function LayupPickerDialog({
  compositionId,
  open,
  currentLayupId,
  onSelect,
  onClose,
}: LayupPickerDialogProps) {
  const { data } = useCompositionDetail(compositionId);
  const layups = data?.layups ?? [];
  return (
    <TablePickerDialog
      open={open}
      titleId="layup-picker-title"
      title="Layups"
      items={layups}
      getId={(l) => String(l.id)}
      currentId={currentLayupId}
      onSelect={onSelect}
      onClose={onClose}
      searchPlaceholder="Search for a layup"
      searchPredicate={(l, q) => l.name.toLowerCase().includes(q)}
      columns={COLUMNS}
      emptyMessage="No layups saved for this composition yet."
    />
  );
}
