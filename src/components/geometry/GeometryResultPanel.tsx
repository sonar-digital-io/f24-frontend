interface GeometryResultPanelProps {
  onGenerate: () => void;
  requested: boolean;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
}

/** "3D view" tab panel — currently just the result-generation trigger + error state. */
export function GeometryResultPanel({ onGenerate, requested, status, error }: GeometryResultPanelProps) {
  return (
    <div className="flex w-full max-w-[404px] flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white/95 p-6 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <p className="text-[16px] font-semibold leading-none text-[#0a0a0a]">Result</p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={requested && status === 'loading'}
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50 self-start"
      >
        {requested && status === 'loading' ? 'Generating…' : 'Generate result'}
      </button>
      {requested && status === 'error' && (
        <p className="text-[13px] text-[#dc2626]">{error ?? 'Failed to generate. Please try again.'}</p>
      )}
    </div>
  );
}
