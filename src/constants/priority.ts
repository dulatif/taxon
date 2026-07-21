import type { Task } from '../types';

export const PRIORITY_CONFIG: Record<
  Task['priority'],
  {
    text: string;
    bg: string;
    border: string;
    weight: number;
  }
> = {
  Critical: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    weight: 4,
  },
  High: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    weight: 3,
  },
  Medium: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    weight: 2,
  },
  Low: {
    text: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    weight: 1,
  },
};

export const PRIORITY_ORDER: Task['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
