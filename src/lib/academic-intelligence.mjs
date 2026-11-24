const dayFormatter = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function dayKey(date){return dayFormatter.format(new Date(date))}

export function shiftDay(day,offset){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}

export function openActivities(activities){return activities.filter(a=>!a.is_demo&&['pending','in_progress'].includes(a.status)&&Number.isFinite(Date.parse(a.due_at)))}

export function studentPlan(activities,now){const today=dayKey(now);const open=openActivities(activities).sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at));const days=Array.from({length:7},(_,i)=>{const key=shiftDay(today,i);return {key,count:open.filter(a=>Date.parse(a.due_at)>=now&&dayKey(a.due_at)===key).length}});return {open,days,overdue:open.filter(a=>Date.parse(a.due_at)<now).length,weekTotal:days.reduce((n,d)=>n+d.count,0)}}

export function teacherLoad(activities,students,courseId,studentId,activityId,dueAt,now){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueAt)||!Number.isFinite(Date.parse(dueAt+'-03:00'))||Date.parse(dueAt+'-03:00')<now)return null;if(dayKey(dueAt+'-03:00')!==dueAt.slice(0,10))return null;const roster=students.filter(s=>s.course_id===courseId&&s.linked_user_id&&!s.is_demo&&(!studentId||s.id===studentId));const recipients=[...new Set(roster.map(s=>s.linked_user_id))];if(!recipients.length)return null;const ids=new Map(students.filter(s=>s.linked_user_id&&!s.is_demo).map(s=>[s.id,s.linked_user_id]));const pending=openActivities(activities).filter(a=>a.id!==activityId&&Date.parse(a.due_at)>=now);const byUser=new Map(recipients.map(id=>[id,[]]));for(const a of pending){const user=ids.get(a.class_student_id);if(byUser.has(user))byUser.get(user).push(dayKey(a.due_at))}const evaluate=key=>{let maxDay=0,maxWindow=0,affected=0;for(const dates of byUser.values()){const same=1+dates.filter(d=>d===key).length;const windowMax=Math.max(...Array.from({length:7},(_,i)=>{const start=shiftDay(key,-i),end=shiftDay(start,6);return 1+dates.filter(d=>d>=start&&d<=end).length}));maxDay=Math.max(maxDay,same);maxWindow=Math.max(maxWindow,windowMax);if(same>=3||windowMax>=5)affected++}return {maxDay,maxWindow,affected}};const key=dueAt.slice(0,10);const current=evaluate(key);const alternatives=Array.from({length:5},(_,i)=>shiftDay(key,i+1)).filter(k=>![0,6].includes(new Date(k+'T12:00:00Z').getUTCDay())).map(k=>({key:k,...evaluate(k)})).sort((a,b)=>a.affected-b.affected||a.maxDay-b.maxDay||a.maxWindow-b.maxWindow||a.key.localeCompare(b.key));const best=alternatives[0];const improved=best&&(best.affected<current.affected||best.affected===current.affected&&(best.maxDay<current.maxDay||best.maxDay===current.maxDay&&best.maxWindow<current.maxWindow));const days=Array.from({length:7},(_,i)=>{const day=shiftDay(key,i-3);const count=Math.max(0,...Array.from(byUser.values(),dates=>dates.filter(d=>d===day).length))+(day===key?1:0);return {key:day,count}});return {...current,days,recipientCount:recipients.length,suggestion:current.affected&&improved?best.key+dueAt.slice(10):null}}

export function gradeProjection(current,weight,hypothetical,goal){if(![current,hypothetical,goal].every(n=>Number.isFinite(n)&&n>=0&&n<=10)||!Number.isFinite(weight)||weight<=0||weight>100)return null;const portion=weight/100;const projected=current*(1-portion)+hypothetical*portion;const required=(goal-current*(1-portion))/portion;return {projected,required:Math.max(0,Math.ceil((required-1e-9)*100)/100),possible:required<=10+1e-9}}

export function studySchedule(activities,now,available,blockMinutes=30){
  const today=dayKey(now);
  const block=Number.isFinite(blockMinutes)&&blockMinutes>=15?blockMinutes:30;
  const days=Array.from({length:7},(_,i)=>({key:shiftDay(today,i),minutes:Math.max(0,Math.min(720,Number(available[i])||0)),tasks:[]}));
  const tasks=openActivities(activities).filter(a=>Date.parse(a.due_at)>=now&&dayKey(a.due_at)<=days[6].key).sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at));
  const unscheduled=[];
  for(const task of tasks){
    const deadline=dayKey(task.due_at);
    const day=days.find(d=>d.key<=deadline&&(d.tasks.length+1)*block<=d.minutes);
    if(day)day.tasks.push(task);else unscheduled.push(task);
  }
  return {days,unscheduled,blockMinutes:block};
}
