import {
  TablePickerDialog,
  type TablePickerColumn,
} from '@/components/common/dialog/TablePickerDialog';
import { formatDateTime, toTitleCase } from '@/lib/utils';
import { useMaterialList } from '@/hooks/api/useMaterials';
import { useMaterialSysconfig } from '@/hooks/api/useSysconfig';
import { getMechPropTypeParameter } from '@/lib/sysconfigMapping';
import type { Material } from '@/api/types/materials';

interface MaterialPickerDialogProps {
  open: boolean;
  currentMaterialName?: string | null;
  onSelect: (materialName: string) => void;
  onClose: () => void;
}

function buildColumns(typeNameById: Map<string, string>): TablePickerColumn<Material>[] {
  return [
    {
      key: 'name',
      label: 'Name',
      widthClassName: 'w-[220px]',
      sortValue: (m) => m.name,
      render: (m) => m.name,
    },
    {
      key: 'type',
      label: 'Type',
      widthClassName: 'w-[160px]',
      sortValue: (m) => typeNameById.get(m.type) ?? m.type ?? '',
      render: (m) => typeNameById.get(m.type) ?? m.type,
    },
    { key: 'description', label: 'Description', render: (m) => m.description ?? '' },
    {
      key: 'lastUpdated',
      label: 'Last updated',
      widthClassName: 'w-[140px] whitespace-nowrap',
      sortValue: (m) => m.last_modified,
      render: (m) => formatDateTime(m.last_modified),
    },
  ];
}

export function MaterialPickerDialog({
  open,
  currentMaterialName,
  onSelect,
  onClose,
}: MaterialPickerDialogProps) {
  const { data } = useMaterialList();
  const materials = data ?? [];
  // Parameterless (no ?material=) sysconfig fetch — just need mech_prop_type's id->name catalog.
  const { data: sysconfigData } = useMaterialSysconfig(NaN);
  const typeOptions = sysconfigData ? getMechPropTypeParameter(sysconfigData)?.options : undefined;
  const typeNameById = new Map((typeOptions ?? []).map((o) => [o.id, toTitleCase(o.name)]));
  const columns = buildColumns(typeNameById);

  return (
    <TablePickerDialog
      open={open}
      titleId="material-picker-title"
      title="Materials"
      items={materials}
      getId={(m) => m.name}
      currentId={currentMaterialName}
      onSelect={onSelect}
      onClose={onClose}
      searchPlaceholder="Search by name, type or description"
      searchPredicate={(m, q) =>
        m.name.toLowerCase().includes(q) ||
        (typeNameById.get(m.type) ?? m.type ?? '').toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
      }
      columns={columns}
      emptyMessage="No materials match your search."
    />
  );
}
