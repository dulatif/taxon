/** Format a Date object as YYYY-MM-DD string */
export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get today's date as YYYY-MM-DD string */
export function getTodayStr(): string {
  return formatDateStr(new Date());
}

/** Format a date string for display (e.g., "Today", "Tomorrow", "Mon, Jan 15") */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr || dateStr.trim() === '') return 'Unscheduled';

  const today = getTodayStr();
  if (dateStr === today) return 'Today';

  const tomDate = new Date();
  tomDate.setDate(tomDate.getDate() + 1);
  if (dateStr === formatDateStr(tomDate)) return 'Tomorrow';

  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  } catch {
    // fallthrough
  }
  return dateStr;
}

/** Format minutes as human-readable string (e.g., "2h 30m", "45m") */
export function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Generate preset date options for quick scheduling */
export function getPresetDates() {
  const now = new Date();
  const today = formatDateStr(now);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = formatDateStr(tomorrowDate);

  const satDate = new Date(now);
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  satDate.setDate(now.getDate() + daysUntilSat);
  const thisSaturday = formatDateStr(satDate);

  const monDate = new Date(now);
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7;
  monDate.setDate(now.getDate() + daysUntilMon);
  const nextMonday = formatDateStr(monDate);

  const weekDate = new Date(now);
  weekDate.setDate(now.getDate() + 7);
  const nextWeek = formatDateStr(weekDate);

  const formatSub = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return [
    { label: 'Today', date: today, sub: 'Later today' },
    { label: 'Tomorrow', date: tomorrow, sub: formatSub(tomorrowDate) },
    { label: 'This Weekend', date: thisSaturday, sub: formatSub(satDate) },
    { label: 'Next Week', date: nextMonday, sub: formatSub(monDate) },
    { label: 'In 1 Week', date: nextWeek, sub: formatSub(weekDate) },
  ];
}

export function formatDateRange(start: string, end: string) {
  try {
    const sDate = new Date(start + 'T00:00:00');
    const eDate = new Date(end + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${sDate.toLocaleDateString('en-US', options)} – ${eDate.toLocaleDateString('en-US', options)}`;
  } catch {
    return `${start} — ${end}`;
  }
}
