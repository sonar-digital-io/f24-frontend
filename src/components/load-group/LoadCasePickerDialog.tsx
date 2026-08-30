import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DialogHeader } from '@/components/common/dialog/DialogHeader';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface PickableLoadCase {
  id: number;
  name: string;
}

interface LoadCasePickerDialogProps {
  open: boolean;
  loadCases: PickableLoadCase[];
  current: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}

export function LoadCasePickerDialog({
  open,
  loadCases,
  current,
  onSelect,
  onClose,
}: LoadCasePickerDialogProps) {
  const [query, setQuery] = useState('');

  useBodyScrollLock(open);
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loadCases;
    return loadCases.filter((lc) => lc.name.toLowerCase().includes(q));
  }, [query, loadCases]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-case-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100vh_-_4rem)] w-full max-w-[480px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <DialogHeader title="Load cases" titleId="load-case-picker-title" onClose={onClose} />

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            autoFocus
            className="h-9 rounded-md border-[#e2e8f0] pl-9 text-[14px]"
          />
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#e5e7eb]">
                <th className="h-10 px-3 text-left text-[14px] font-medium text-[#6b7280]">Name</th>
                <th className="h-10 w-[100px] px-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lc) => (
                <tr
                  key={lc.id}
                  className={`border-b border-[#e5e7eb] last:border-b-0 ${
                    lc.id === current ? 'bg-[#eef9ff]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <td className="px-3 py-3 text-[14px] font-medium text-[#0a0a0a]">{lc.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => { onSelect(lc.id); onClose(); }}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-[#006496] px-3 text-[13px] font-medium text-[#fafafa] hover:bg-[#005580]"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                    No load cases match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
