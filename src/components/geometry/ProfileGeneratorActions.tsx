interface ProfileGeneratorActionsProps {
  onSaveParameters?: () => void;
  onGenerate?: () => void;
  onSaveAndNext?: () => void;
  saving?: boolean;
  generating?: boolean;
  savingAndNext?: boolean;
  hasEnoughPoints: boolean;
  saveError?: boolean;
  generateError?: boolean;
  saveAndNextError?: boolean;
}

/** Save parameters / Generate / Save & Next action row, plus its shared error states. */
export function ProfileGeneratorActions({
  onSaveParameters,
  onGenerate,
  onSaveAndNext,
  saving,
  generating,
  savingAndNext,
  hasEnoughPoints,
  saveError,
  generateError,
  saveAndNextError,
}: ProfileGeneratorActionsProps) {
  if (!onSaveParameters && !onGenerate && !onSaveAndNext) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {onSaveParameters && (
          <button
            type="button"
            onClick={onSaveParameters}
            disabled={saving || !hasEnoughPoints}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save parameters'}
          </button>
        )}
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || !hasEnoughPoints}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        )}
        {onSaveAndNext && (
          <button
            type="button"
            onClick={onSaveAndNext}
            disabled={savingAndNext || !hasEnoughPoints}
            className="inline-flex h-8 items-center justify-center rounded-md bg-[#006496] px-3 text-[12px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#005580] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAndNext ? 'Saving…' : 'Save & Next'}
          </button>
        )}
      </div>
      {!hasEnoughPoints && <p className="text-[13px] text-[#dc2626]">Each curve needs at least 2 points.</p>}
      {saveError && <p className="text-[13px] text-[#dc2626]">Failed to save parameters. Please try again.</p>}
      {generateError && <p className="text-[13px] text-[#dc2626]">Failed to generate. Please try again.</p>}
      {saveAndNextError && <p className="text-[13px] text-[#dc2626]">Failed to save profiles. Please try again.</p>}
    </div>
  );
}
