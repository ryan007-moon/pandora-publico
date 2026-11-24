import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const {outputText}=ts.transpileModule(read('src/lib/achievements.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const mod={exports:{}};new Function('module','exports',outputText)(mod,mod.exports);
const {achievementRank}=mod.exports;
test('new students have no medal; progression respects exact thresholds',()=>{
 for(const [count,rank] of [[0,'Não classificado'],[1,'Bronze'],[2,'Bronze'],[3,'Prata'],[6,'Prata'],[7,'Ouro'],[11,'Ouro'],[12,'Platina'],[19,'Platina'],[20,'Diamante'],[34,'Diamante'],[35,'Pandora'],[100,'Pandora']])assert.equal(achievementRank(count).rank.name,rank);
 assert.equal(achievementRank(2).progress,50);assert.equal(achievementRank(35).progress,100);
});
test('count uses distinct activity rows with actual submission dates even during revision',()=>{
 const api=read('src/app/api/aluno/conquistas/route.ts');
 assert.match(api,/count:'exact'/);assert.match(api,/\.eq\('is_demo',false\)\.not\('submitted_at','is',null\)/);
 assert.match(api,/\.in\('class_student_id',ctx.ids\)/);assert.match(api,/verifyOrigin\(request\)/);assert.match(api,/if\(!ctx.director\)/);
});
test('honors have RLS, ownership checks, unique kinds and no student update privilege',()=>{
 const sql=read('supabase/migrations/20261124195722_student_honors_progression.sql');
 assert.match(sql,/primary key \(student_id,kind\)/i);assert.match(sql,/enable row level security/i);
 assert.match(sql,/granted_by=\(select auth.uid\(\)\)/);assert.match(sql,/p.role='professor'/);assert.match(sql,/s.teacher_id=\(select auth.uid\(\)\)/);
 assert.match(sql,/grant select,insert,delete on public.student_honors to authenticated/i);
});
