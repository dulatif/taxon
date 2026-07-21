interface StatsBarProps {
  totalFocusedHours: number;
  totalCompletedCount: number;
}

export default function StatsBar({ totalFocusedHours, totalCompletedCount }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <div className="p-4 bg-surface-secondary border border-border-primary rounded-lg">
        <div className="text-xl font-bold font-mono text-text-primary">
          {totalFocusedHours.toFixed(1)}h
        </div>
        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wide mt-1">
          Time Focused
        </div>
      </div>
      <div className="p-4 bg-surface-secondary border border-border-primary rounded-lg">
        <div className="text-xl font-bold font-mono text-text-primary">{totalCompletedCount}</div>
        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wide mt-1">
          Tasks Done
        </div>
      </div>
    </div>
  );
}
