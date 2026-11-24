import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const {outputText}=ts.transpileModule(read('src/lib/attendance.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const mod={exports:{}};new Function('module','exports',outputText)(mod,mod.exports);
const {attendanceStreak,validDay,brazilDay}=mod.exports;
const p=attendance_date=>({attendance_date,status:'present'}),a=attendance_date=>({attendance_date,status:'absent'});
test('attendance starts empty, counts unique days and ignores weekends or unrecorded dates',()=>{
 assert.equal(attendanceStreak([],null).days,0);
 const r=attendanceStreak([p('2026-11-20'),p('2026-11-23'),p('2026-11-23')],null);
 assert.equal(r.days,2);assert.equal(r.weeks,2);
});
test('absence resets and correcting the same date restores the streak',()=>{
 const rows=[p('2026-11-20'),a('2026-11-23')];
 assert.equal(attendanceStreak(rows,null).days,0);
 assert.equal(attendanceStreak([...rows,p('2026-11-24')],null).days,1);
 assert.equal(attendanceStreak([p('2026-11-20'),p('2026-11-23')],null).days,2);
});
test('history does not duplicate weeks or hide attendance; a gap does not add a week',()=>{
 const b={through_date:'2026-11-23',days:60,weeks:12};
 assert.equal(attendanceStreak([p('2026-11-24')],b).weeks,12);
 assert.equal(attendanceStreak([p('2026-11-24')],b).days,61);
 assert.equal(attendanceStreak([a('2026-11-24')],b).days,0);
 assert.equal(attendanceStreak([p('2026-11-23')],b).days,1);
 assert.equal(attendanceStreak([p('2026-11-24'),p('2026-12-08')],b).weeks,1);
});
test('calendar dates and Sao Paulo midnight are validated',()=>{
 assert.equal(validDay('2026-02-30'),false);assert.equal(brazilDay(new Date('2026-11-25T01:00:00Z')),'2026-11-24');
});
test('attendance mutation requires director and origin; RLS protects both tables',()=>{
 const api=read('src/app/api/aluno/frequencia/route.ts');const sql=read('supabase/migrations/20261124200108_student_attendance_streak.sql');
 assert.match(api,/verifyOrigin\(request\)/);assert.match(api,/if\(!ctx.director\)/);assert.match(api,/onConflict:'student_id,attendance_date'/);
 for(const t of ['student_attendance','student_attendance_baselines'])assert.ok(sql.includes('alter table public.'+t+' enable row level security'));
});
