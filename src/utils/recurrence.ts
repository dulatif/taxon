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
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date(todayDate);
  }

  const next = new Date(baseDate);
  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;

  const advance = (dateToAdvance: Date) => {
    switch (rule.frequency) {
      case 'daily': {
        dateToAdvance.setDate(dateToAdvance.getDate() + interval);
        break;
      }
      case 'weekdays': {
        do {
          dateToAdvance.setDate(dateToAdvance.getDate() + 1);
        } while (dateToAdvance.getDay() === 0 || dateToAdvance.getDay() === 6);
        break;
      }
      case 'weekly': {
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
          const currentDay = dateToAdvance.getDay();
          const nextDayInSameWeek = sortedDays.find((d) => d > currentDay);
          if (nextDayInSameWeek !== undefined) {
            dateToAdvance.setDate(dateToAdvance.getDate() + (nextDayInSameWeek - currentDay));
          } else {
            const daysUntilNextWeek = 7 - currentDay + sortedDays[0]! + (interval - 1) * 7;
            dateToAdvance.setDate(dateToAdvance.getDate() + daysUntilNextWeek);
          }
        } else {
          dateToAdvance.setDate(dateToAdvance.getDate() + interval * 7);
        }
        break;
      }
      case 'monthly': {
        dateToAdvance.setMonth(dateToAdvance.getMonth() + interval);
        break;
      }
      case 'yearly': {
        dateToAdvance.setFullYear(dateToAdvance.getFullYear() + interval);
        break;
      }
      case 'custom': {
        dateToAdvance.setDate(dateToAdvance.getDate() + interval);
        break;
      }
    }
  };

  // Always advance at least once
  advance(next);

  // If the next date is still in the past, keep advancing until it reaches today or the future
  let guard = 0;
  while (next < todayDate && guard < 1000) {
    advance(next);
    guard++;
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
