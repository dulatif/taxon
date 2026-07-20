import React from 'react';
import type { DailyActivity } from '../../types';

interface ActivityChartProps {
  dailyActivity: DailyActivity[];
}

export default function ActivityChart({ dailyActivity }: ActivityChartProps) {
  return (
    <div className="flex items-end justify-between gap-2 h-24 pt-2">
      {dailyActivity.map((act, i) => {
        // Max hours for scale is 6 hours
        const percentage = Math.min((act.hours / 6) * 100, 100);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
          >
            <div className="text-[9px] font-mono font-medium text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
              {act.hours}h
            </div>
            <div className="w-full relative rounded-t-sm h-full flex items-end">
              <div
                style={{ height: `${percentage}%` }}
                className={`w-full rounded-t-sm transition-all duration-500 hover:opacity-150 ${
                  act.isToday
                    ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                    : 'bg-surface-hover group-hover:bg-white/50'
                }`}
              ></div>
            </div>
            <span
              className={`text-[10px] font-medium ${
                act.isToday ? 'text-text-primary font-bold' : 'text-text-muted/80'
              }`}
            >
              {act.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}
