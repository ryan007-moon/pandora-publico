import type { CourseSubject } from './academic';

export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
};

type ScheduledSubject = Pick<
  CourseSubject, 'weekday' | 'starts_at' | 'ends_at' | 'id' | 'course_id' | 'title' | 'summary' | 'faculty' | 'classroom_id' | 'learning_goals'
>;

export type UpcomingClass = {
  subject: CourseSubject;
  weekday: string;
  clock: string;
  startsAtMinutes: number;
  minutesUntil: number;
};

/** Uses the current instant in Brasília, independent of the client's timezone. */
export function upcomingSubjectClasses(subjects: CourseSubject[], at: Date, limit = 3): UpcomingClass[] {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const find = (type: string) => parts.find(part => part.type === type)?.value || '';
  const thisWeekday = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[find('weekday')];
  const nowMinutes = Number(find('hour')) * 60 + Number(find('minute'));
  if (!thisWeekday || !Number.isFinite(nowMinutes)) return [];

  return subjects.flatMap(subject => {
    const weekday = subject.weekday;
    const clock = subject.starts_at?.slice(0, 5) ?? '';
    if (!weekday || !WEEKDAY_NAMES[weekday] || !/^\d\d:\d\d$/.test(clock)) return [];
    const [hours, minutes] = clock.split(':').map(Number);
    const startsAtMinutes = hours * 60 + minutes;
    const ahead = (weekday - thisWeekday + 7) % 7;
    let minutesUntil = ahead * 1440 + startsAtMinutes - nowMinutes;
    if (minutesUntil < 0) minutesUntil += 7 * 1440;
    return [{ subject, weekday: WEEKDAY_NAMES[weekday], clock, startsAtMinutes, minutesUntil }];
  }).sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0,limit);
}

export function courseClassTime(subject: ScheduledSubject) {
  return subject.weekday && subject.starts_at
    ? `${WEEKDAY_NAMES[subject.weekday] ?? 'Dia a definir'} · ${subject.starts_at.slice(0,5)}${subject.ends_at ? '–' + subject.ends_at.slice(0,5) : ''}`
    : 'Horário ainda não definido';
}
