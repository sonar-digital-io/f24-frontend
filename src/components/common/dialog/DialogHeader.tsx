import { X } from 'lucide-react';

interface DialogHeaderProps {
  title: string;
  titleId?: string;
  onClose: () => void;
  /** Wrapper classes — override for a draggable header (cursor-move + items-start). */
  containerClassName?: string;
  titleClassName?: string;
}

/** "{title}" + X close button row shared by the app's dialogs/popovers. */
export function DialogHeader({
  title,
  titleId,
  onClose,
  containerClassName = 'flex items-center justify-between gap-4',
  titleClassName = 'text-[20px] font-bold leading-7 text-[#181c20]',
}: DialogHeaderProps) {
  return (
    <div className={containerClassName}>
      <h2 id={titleId} className={titleClassName}>
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-6 w-6 items-center justify-center rounded text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0a0a0a]"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
