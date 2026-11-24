import type { Activity } from './academic';
export function dayKey(date: number | string | Date): string;
export function shiftDay(day: string, offset: number): string;
export function openActivities(activities: Activity[]): Activity[];
export function studentPlan(activities: Activity[], now: number): {open: Activity[]; days: {key:string;count:number}[]; overdue:number;weekTotal:number};
type Student={id:string;course_id:string;linked_user_id:string|null;is_demo:boolean};
export function teacherLoad(activities: Activity[],students:Student[],courseId:string,studentId:string,activityId:string,dueAt:string,now:number): {maxDay:number;maxWindow:number;affected:number;recipientCount:number;days:{key:string;count:number}[];suggestion:string|null}|null;
export function gradeProjection(current:number,weight:number,hypothetical:number,goal:number): {projected:number;required:number;possible:boolean}|null;

export function studySchedule(activities: Activity[], now: number, available: number[], blockMinutes?:number): {days:{key:string;minutes:number;tasks:Activity[]}[];unscheduled:Activity[];blockMinutes:number};
