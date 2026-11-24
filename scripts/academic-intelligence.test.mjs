import test from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,studentPlan,teacherLoad,gradeProjection,studySchedule} from '../src/lib/academic-intelligence.mjs';
const now=Date.parse('2026-11-18T12:00:00-03:00');
const a=(id,day,student='s1',status='pending',is_demo=false)=>({id,due_at:day+'T18:00:00-03:00',class_student_id:student,status,is_demo});
const sample=[a('1','2026-11-17'),a('2','2026-11-19'),a('3','2026-11-19'),a('4','2026-11-19','s1','reviewed'),a('5','2026-11-19','s1','pending',true)];
const students=[{id:'s1',course_id:'c',linked_user_id:'u1',is_demo:false},{id:'s2',course_id:'c',linked_user_id:'u2',is_demo:false},{id:'s3',course_id:'other',linked_user_id:'u1',is_demo:false}];
test('planner ignores demo/completed, separates overdue and uses Brasilia days',()=>{const p=studentPlan(sample,now);assert.equal(p.overdue,1);assert.equal(p.weekTotal,2);assert.equal(p.days[1].count,2);assert.equal(dayKey('2026-11-19T01:30:00Z'),'2026-11-18');});
test('workload counted per linked recipient across owned courses',()=>{const p=teacherLoad([...sample,a('6','2026-11-19','s3'),a('7','2026-11-19','s2')],students,'c','','','2026-11-19T18:00',now);assert.equal(p.maxDay,4);assert.equal(p.affected,1);assert.equal(p.recipientCount,2);assert.equal(p.suggestion,'2026-11-20T18:00');});
test('editing excludes activity; invalid recipient and historical dates return null',()=>{assert.equal(teacherLoad(sample,students,'c','s1','2','2026-11-19T18:00',now).maxDay,2);assert.equal(teacherLoad(sample,students,'c','unknown','','2026-11-19T18:00',now),null);assert.equal(teacherLoad(sample,students,'c','','','2026-11-17T18:00',now),null);});
test('hypothetical goal handles unreachable and invalid inputs',()=>{assert.equal(gradeProjection(6,40,9,7).required,8.5);assert.equal(gradeProjection(2,10,10,9).possible,false);assert.equal(gradeProjection(6,0,8,7),null);});

test('study schedule respects capacity and deadlines without promising completion',()=>{const tasks=[a('a','2026-11-18'),a('b','2026-11-19'),a('c','2026-11-18'),a('d','2026-11-18','s1','reviewed')];const p=studySchedule(tasks,now,[30,30,0,0,0,0,0]);assert.deepEqual(p.days[0].tasks.map(a=>a.id),['a']);assert.deepEqual(p.days[1].tasks.map(a=>a.id),['b']);assert.deepEqual(p.unscheduled.map(a=>a.id),['c']);});

import {readFileSync} from 'node:fs';
test('new activity notifications refresh the shared academic snapshot without extra polling',()=>{const source=readFileSync(new URL('../src/hooks/useGradeNotifications.ts',import.meta.url),'utf8');assert.ok(source.includes("item.target_path.startsWith('/atividades#')"));assert.ok(source.includes("pandora:academic-records-refresh"));});

test('landing image quality is allowed by Next configuration and local fallback retries original',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const config=read('next.config.mjs');
 const allowed=JSON.parse(config.match(/qualities:\s*(\[[^\]]+\])/)[1]);
 for(const p of ['src/app/landing/components/FaixaDourada.tsx','src/app/landing/components/CampusCarousel.tsx']){
   for(const match of read(p).matchAll(/quality=\{(\d+)\}/g)) assert.ok(allowed.includes(Number(match[1])));
 }
 assert.match(read('src/components/ui/AppImage.tsx'),/setDirectSource\(true\)/);
});
test('empty week skips planning form and keeps projection discoverable',()=>{
 const dashboard=readFileSync(new URL('../src/app/components/DashboardContent.tsx',import.meta.url),'utf8');
 const notes=readFileSync(new URL('../src/app/notas/components/NotasContent.tsx',import.meta.url),'utf8');
 assert.match(dashboard,/plan.weekTotal>0 && <AcademicStudyPlan/);
 assert.match(dashboard,/plan.weekTotal === 0 && plan.overdue === 0/);
 assert.match(notes,/simulador será liberado/);
});

test('projection isolates controls and result from inverted theme surfaces',()=>{
 const component=readFileSync(new URL('../src/app/notas/components/AcademicProjection.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles/portal-refinement.css',import.meta.url),'utf8');
 assert.match(component,/projection-result/);
 assert.match(component,/aria-invalid/);
 assert.match(component,/projection-range-fill/);
 assert.match(component,/hashchange/);
 assert.doesNotMatch(component,/bg-secondary|accent-\[/);
 assert.match(css,/\.academic-projection \.projection-range::-webkit-slider-thumb/);
 assert.match(css,/\.academic-projection \.projection-range::-moz-range-thumb/);
});

test('Sync exposes seven actual daily recipient maxima including proposed due date',()=>{
 const p=teacherLoad(sample,students,'c','s1','','2026-11-19T18:00',now);
 assert.equal(p.days.length,7);
 assert.equal(p.days.find(d=>d.key==='2026-11-19').count,3);
});
test('Replay and DNA are embedded and teacher writes are authenticated',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('src/app/disciplinas/components/StudentSubjects.tsx'),/<StudentReplay/);
 assert.match(read('src/app/projetos/components/StudentProjects.tsx'),/<StudentDNA/);
 const api=read('src/app/api/professor/intelligence/route.ts');
 assert.match(api,/verifyOrigin\(request\)/);
 assert.match(api,/requireTeacher\(\)/);
 assert.match(api,/teacher_id:user.id/);
});
