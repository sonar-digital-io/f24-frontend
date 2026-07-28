import { DialogHeader } from '@/components/common/dialog/DialogHeader';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button for destructive actions (e.g. delete). */
  danger?: boolean;
  confirmDisabled?: boolean;
}

const TITLE_ID = 'confirm-dialog-title';

/** Generic confirm/cancel modal — shared by delete confirmations and similar prompts. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  useBodyScrollLock(open);
  useEscapeKey(onCancel, open);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
      >
        <DialogHeader title={title} titleId={TITLE_ID} onClose={onCancel} />
        <p className="text-[14px] leading-5 text-[#4b5563]">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md bg-[#f1f5f9] px-4 text-[14px] font-medium text-[#171717] hover:bg-[#e2e8f0]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`inline-flex h-9 items-center rounded-md px-4 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              danger ? 'bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#006496] hover:bg-[#005580]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
