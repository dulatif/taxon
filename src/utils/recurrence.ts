import type { RecurrenceRule } from '../types';

export const calculateNextDueDate = (currentDateStr?: string, rule?: RecurrenceRule): string => {
  if (!rule) return currentDateStr || '';
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const todayDate = new Date(todayStr + 'T00:00:00');
  let baseDate =
    currentDateStr && currentDateStr.trim() !== ''
      ? new Date(currentDateStr.substring(0, 10) + 'T00:00:00')
      : new Date(todayDate);
  if (isNaN(baseDate.getTime()) || baseDate < todayDate) {
    baseDate = new Date(todayDate);
  }

  const next = new Date(baseDate);
  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;

  switch (rule.frequency) {
    case 'daily': {
      next.setDate(next.getDate() + interval);
      break;
    }
    case 'weekdays': {
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      break;
    }
    case 'weekly': {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        const currentDay = next.getDay();
        const nextDayInSameWeek = sortedDays.find((d) => d > currentDay);
        if (nextDayInSameWeek !== undefined) {
          next.setDate(next.getDate() + (nextDayInSameWeek - currentDay));
        } else {
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0]! + (interval - 1) * 7;
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      } else {
        next.setDate(next.getDate() + interval * 7);
      }
      break;
    }
    case 'monthly': {
      next.setMonth(next.getMonth() + interval);
      break;
    }
    case 'yearly': {
      next.setFullYear(next.getFullYear() + interval);
      break;
    }
    case 'custom': {
      next.setDate(next.getDate() + interval);
      break;
    }
  }

  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRecurrenceLabel = (rule?: RecurrenceRule): string => {
  if (!rule) return 'None';
  if (rule.frequency === 'daily') {
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} days` : 'Daily';
  }
  if (rule.frequency === 'weekdays') return 'Weekdays';
  if (rule.frequency === 'weekly') {
    if (rule.interval && rule.interval > 1) return `Every ${rule.interval} weeks`;
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Weekly on ${rule.daysOfWeek.map((d) => days[d]).join(', ')}`;
    }
    return 'Weekly';
  }
  if (rule.frequency === 'monthly') {
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} months` : 'Monthly';
  }
  if (rule.frequency === 'yearly') {
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} years` : 'Yearly';
  }
  if (rule.frequency === 'custom') {
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} days` : 'Custom';
  }
  return 'None';
};
