import { ActivityLogEntry, DailyActivity } from '../types';

/**
 * TAXON-113: Log a task completion event.
 * Returns a new ActivityLogEntry to be appended to the activity log.
 */
export function createLogEntry(taskId: string, taskTitle: string): ActivityLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    taskId,
    taskTitle,
    completedAt: new Date().toISOString(),
  };
}

/**
 * TAXON-114: Aggregate activity log data into daily metrics.
 * Parses the activity log and calculates:
 * - Focus Velocity: (completed / total tasks) * 100
 * - Task Accomplishments: total completed in last 30 days
 * - Daily chart data: completions and estimated hours per day
 */
export function aggregateActivityData(
  log: ActivityLogEntry[],
  totalTaskCount: number
): {
  focusVelocity: number;
  taskAccomplishments: number;
  streak: number;
} {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter log entries from last 30 days
  const recentEntries = log.filter(entry => {
    const entryDate = new Date(entry.completedAt);
    return entryDate >= thirtyDaysAgo && entryDate <= now;
  });

  const taskAccomplishments = recentEntries.length;

  // Focus velocity: ratio of completed tasks to total
  const focusVelocity = totalTaskCount > 0
    ? Math.min(100, Math.round((taskAccomplishments / Math.max(totalTaskCount, 1)) * 100))
    : 0;

  // Calculate streak: consecutive days with at least one completion
  const streak = calculateStreak(log);

  return {
    focusVelocity,
    taskAccomplishments,
    streak,
  };
}

/**
 * Calculate the current streak of consecutive days with completions.
 * Works backward from today.
 */
function calculateStreak(log: ActivityLogEntry[]): number {
  if (log.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a Set of date strings that have completions
  const completionDates = new Set<string>();
  for (const entry of log) {
    const d = new Date(entry.completedAt);
    d.setHours(0, 0, 0, 0);
    completionDates.add(d.toISOString().split('T')[0]);
  }

  let streak = 0;
  const checkDate = new Date(today);

  // Check today first, if no completion today, start from yesterday
  const todayStr = checkDate.toISOString().split('T')[0];
  if (!completionDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completionDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Update the daily activity array with a new completion.
 * Finds today's entry and increments its completions and hours.
 */
export function updateDailyActivityWithCompletion(
  activity: DailyActivity[],
  hoursIncrement: number = 0.2
): DailyActivity[] {
  return activity.map(act => {
    if (act.isToday) {
      return {
        ...act,
        hours: Number((act.hours + hoursIncrement).toFixed(1)),
        completions: act.completions + 1,
      };
    }
    return act;
  });
}

/**
 * Calculate the number of completions today from the activity log.
 */
export function getCompletionsToday(log: ActivityLogEntry[]): number {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return log.filter(entry => {
    return entry.completedAt.startsWith(todayStr);
  }).length;
}

/**
 * Calculate total focused hours from the activity log (estimated).
 * Each completion is estimated at ~25 minutes (0.42 hours) of focus.
 */
export function getFocusedHoursToday(log: ActivityLogEntry[]): number {
  const completionsToday = getCompletionsToday(log);
  return Number((completionsToday * 0.42).toFixed(1));
}
