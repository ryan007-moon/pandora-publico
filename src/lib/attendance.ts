export type AttendanceDay = {attendance_date:string;status:'present'|'absent'};
export type AttendanceBaseline = {through_date:string;days:number;weeks:number};
export type AttendanceData = {today:string;baseline:AttendanceBaseline|null;days:AttendanceDay[];streak:{days:number;weeks:number;historical:boolean;lastDate:string|null}};
const DAY=86400000;
const dateMs=(s:string)=>Date.parse(s+'T00:00:00Z');
export function validDay(value:unknown):value is string {
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(dateMs(value))&&new Date(dateMs(value)).toISOString().slice(0,10)===value;
}
export function brazilDay(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');
}
export function previousDay(day:string){return new Date(dateMs(day)-DAY).toISOString().slice(0,10);}
function weekStart(day:string){const t=dateMs(day);return t-((new Date(t).getUTCDay()+6)%7)*DAY;}
export function attendanceStreak(rows:AttendanceDay[], baseline:AttendanceBaseline|null) {
 const ordered=[...new Map(rows.map(r=>[r.attendance_date,r])).values()].sort((a,b)=>a.attendance_date.localeCompare(b.attendance_date));
 // An overlapping daily register always takes precedence over imported history.
 const prior=baseline&&!ordered.some(r=>r.attendance_date<=baseline.through_date)?baseline:null;
 const lastAbsence=ordered.reduce((last,r,i)=>r.status==='absent'?i:last,-1);
 const current=ordered.slice(lastAbsence+1).filter(r=>r.status==='present');
 const historical=lastAbsence<0&&prior!==null&&prior.days>0;
 const days=current.length+(historical?prior.days:0);
 const weekKeys=[...new Set(current.map(r=>weekStart(r.attendance_date)))].sort((a,b)=>b-a);
 let weeks=weekKeys.length?1:0;
 for(let i=1;i<weekKeys.length;i++){if(weekKeys[i-1]-weekKeys[i]!==7*DAY)break;weeks++;}
 if(historical&&prior.weeks>0){
  if(!weeks)weeks=prior.weeks;
  else {const oldest=weekKeys[weeks-1],anchor=weekStart(prior.through_date);if(oldest===anchor)weeks+=prior.weeks-1;else if(oldest-anchor===7*DAY)weeks+=prior.weeks;}
 }
 return {days,weeks,historical,lastDate:current.at(-1)?.attendance_date??(historical?prior.through_date:null)};
}
