// Small shared presentational controls for the /nurbs fullscreen editor.

interface ToggleBtnProps {
  active: boolean;
  onClick: () => void;
  color?: string;
  label: string;
}

export function ToggleBtn({ active, onClick, label }: ToggleBtnProps) {
  const showOnOff = typeof label === 'string' && !['Solid', 'Shell', 'Ruled', 'Smooth'].includes(label);
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
        active
          ? 'bg-black border-white/40 text-white'
          : 'bg-black/50 border-white/15 text-white/50 hover:text-white hover:border-white/30'
      }`}
    >
      {label}{showOnOff ? (active ? ' ON' : ' OFF') : ''}
    </button>
  );
}

interface StatBadgeProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  green?: boolean;
  orange?: boolean;
}

export function StatBadge({ label, value, highlight, green, orange }: StatBadgeProps) {
  let valueClass = 'text-base font-semibold';
  if (highlight) valueClass += ' text-cyan-400';
  else if (green) valueClass += ' text-green-400';
  else if (orange) valueClass += ' text-orange-400';

  return (
    <div className="flex justify-between items-center gap-5 px-4 py-2.5 bg-background/85 backdrop-blur-sm border border-border rounded-lg">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
