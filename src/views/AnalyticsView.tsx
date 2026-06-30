import React from 'react';
import { Flame } from 'lucide-react';
import { DailyActivity, ActivityLogEntry, Task } from '../types';
import {
  aggregateActivityData,
} from '../services/activityLogger';

interface AnalyticsViewProps {
  tasks: Task[];
  dailyActivity: DailyActivity[];
  activityLog: ActivityLogEntry[];
}

export default function AnalyticsView({ tasks, dailyActivity, activityLog }: AnalyticsViewProps) {
  const analyticsData = aggregateActivityData(activityLog, tasks.length);

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Performance Analytics</h2>
          <p className="text-xs text-[#8E9192] mt-1">Daily metrics report mapping metrics across sprints.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5 relative overflow-hidden">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Focus Velocity</span>
            <div className="text-3xl font-bold font-mono text-white mt-2">{analyticsData.focusVelocity}%</div>
            <p className="text-[10px] text-[#8E9192] mt-1">Completion rate across all tasks</p>
          </div>
          <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Task Accomplishments</span>
            <div className="text-3xl font-bold font-mono text-white mt-2">{analyticsData.taskAccomplishments}</div>
            <p className="text-[10px] text-[#8E9192] mt-1">Completed across 30 days</p>
          </div>
          <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Uninterrupted Streaks</span>
            <div className="text-3xl font-bold font-mono text-white mt-2 flex items-center gap-2">
              <Flame className="w-6 h-6 text-white fill-current animate-pulse" />
              <span>{analyticsData.streak} Day{analyticsData.streak !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-[#8E9192] mt-1">Maintained focus sprint daily</p>
          </div>
        </div>

        {/* Grid chart representation */}
        <div className="border-t border-[#27272A]/50 pt-6">
          <h3 className="text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono mb-4">Strategic Activity Load</h3>
          <div className="h-48 flex items-end justify-between gap-4">
            {dailyActivity.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                <div className="text-xs text-[#8E9192] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {d.completions}t / {(d.hours * 60).toFixed(0)}m
                </div>
                <div
                  style={{ height: `${(d.hours / 6) * 100}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 ${d.isToday ? 'bg-white' : 'bg-[#1C1B1B] hover:bg-zinc-700'}`}
                />
                <span className="text-[10px] uppercase font-bold font-mono text-[#8E9192]">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
