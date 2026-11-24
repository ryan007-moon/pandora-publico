'use client';
import {useState,useMemo,useRef,type FormEvent,type ReactNode} from 'react';
import {Award,CalendarCheck,ClipboardList,Bell,Mail,BookOpen,RefreshCw,GraduationCap,Search,CheckCircle2,Loader2,UserRound,Zap} from 'lucide-react';
import {DirectorAttendance} from '@/app/perfil/components/AttendancePanel';
import {DirectorHonors} from '@/app/perfil/components/AchievementPanel';
import TeacherSubmissionReview from './TeacherSubmissionReview';
import TeacherCompetencies from './TeacherCompetencies';
import TeacherMaterialUpload from './TeacherMaterialUpload';
import {activityStatuses,brasiliaInput,brasiliaLabel,type Activity,type Competency} from '@/lib/academic';
import '@/styles/presentation-desk.css';

type Student={id:string;course_id:string;display_name:string;linked_user_id:string|null;is_demo:boolean;email:string|null;created_at:string};
type Course={id:string;title:string;code:string};
type Subject={id:string;course_id:string;title:string};
type Grade={id:string;course_id:string;class_student_id:string;assessment:string;score:number;is_demo:boolean;subject_id:string|null};
type Material={id:string;course_id:string;title:string;body:string;file_path?:string|null};
type Announcement={id:string;course_id:string;class_student_id:string|null;title:string;body:string};
type Data={students:Student[];courses:Course[];subjects:Subject[];grades:Grade[];activities:Activity[];announcements:Announcement[];materials:Material[];competencies?:Competency[]};
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const field='teacher-field';
function Panel({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}){
 return <section className="pd-panel"><header className="pd-panel-title">{icon}<h3>{title}</h3></header>{children}</section>;
}
function Submit({busy,children}:{busy:boolean;children:ReactNode}){
 return <button type="submit" className="teacher-submit" disabled={busy}>{busy?<Loader2 size={16} className="animate-spin"/>:null}{children}</button>;
}
export default function PresentationDesk({data,refresh,onlineStudentIds}:{data:Data;refresh:()=>Promise<void>;onlineStudentIds:string[]|null}){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const students=useMemo(()=>data.students.filter(s=>!s.is_demo&&s.linked_user_id).sort((a,b)=>b.created_at.localeCompare(a.created_at)),[data.students]);
 const matches=students.filter(s=>normal(s.display_name+' '+(s.email??'')).includes(normal(query.trim())));
 const student=students.find(s=>s.id===selected);
 const course=student?data.courses.find(c=>c.id===student.course_id):undefined;
 async function update(){if(refreshing)return;setRefreshing(true);try{await refresh();}finally{setRefreshing(false);}}
 return <section className="pd-root" aria-labelledby="pd-title">
  <header className="pd-hero"><div><span className="pd-overline">Direção acadêmica</span><h2 id="pd-title">Modo apresentação</h2><p>Selecione o estudante e gerencie seu percurso acadêmico em uma única tela.</p></div><button type="button" className="teacher-refresh" disabled={refreshing} onClick={()=>void update()}><RefreshCw size={15} className={refreshing?'animate-spin':''}/> Atualizar alunos</button></header>
  <div className="pd-select"><label><span><Search size={15}/> Buscar aluno recém-matriculado</span><input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome ou e-mail"/></label><label><span>Aluno selecionado</span><select className={field} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione um estudante</option>{student&&!matches.some(s=>s.id===student.id)&&<option value={student.id}>{student.display_name}</option>}{matches.map(s=><option key={s.id} value={s.id}>{s.display_name} — {s.email??data.courses.find(c=>c.id===s.course_id)?.code}</option>)}</select></label></div>
  {!student||!course||!student.linked_user_id?<div className="pd-empty"><UserRound size={32} strokeWidth={1.4}/><h3>{students.length?'Selecione o aluno da dinâmica':'Aguardando a primeira matrícula'}</h3><p>O cadastro feito durante a apresentação aparecerá automaticamente. Nenhum dado é preenchido sem selecionar a conta real.</p></div>:<StudentDesk key={student.id} student={student} course={course} data={data} refresh={refresh} online={onlineStudentIds===null?null:onlineStudentIds.includes(student.linked_user_id)}/>}
 </section>;
}
function StudentDesk({student,course,data,refresh,online}:{student:Student;course:Course;data:Data;refresh:()=>Promise<void>;online:boolean|null}){
 const subjects=data.subjects.filter(s=>s.course_id===course.id);
 const grades=data.grades.filter(g=>!g.is_demo&&g.class_student_id===student.id);
 const activities=data.activities.filter(a=>!a.is_demo&&a.class_student_id===student.id);
 const announcements=data.announcements.filter(a=>a.class_student_id===student.id);
 const materials=data.materials.filter(m=>m.course_id===course.id);
 const [busy,setBusy]=useState('');const pending=useRef(false);
 const [feedback,setFeedback]=useState<{section:string;text:string;error:boolean}|null>(null);
 const [gradeId,setGradeId]=useState(''),[assessment,setAssessment]=useState(''),[score,setScore]=useState(''),[gradeSubject,setGradeSubject]=useState('');
 const [activityId,setActivityId]=useState(''),[activityTitle,setActivityTitle]=useState(''),[activityBody,setActivityBody]=useState(''),[activitySubject,setActivitySubject]=useState(''),[category,setCategory]=useState<'activity'|'project'>('project'),[dueAt,setDueAt]=useState(()=>brasiliaInput(new Date(Date.now()+86400000)));
 const [noticeTitle,setNoticeTitle]=useState(''),[noticeBody,setNoticeBody]=useState('');
 const [emailTitle,setEmailTitle]=useState(''),[emailBody,setEmailBody]=useState('');
 const [materialTitle,setMaterialTitle]=useState(''),[materialBody,setMaterialBody]=useState('');
 const [emailRequest,setEmailRequest]=useState('');
 const [quickResults,setQuickResults]=useState<Record<string,string>>({});
 const [detailVersion,setDetailVersion]=useState(0);
 function result(section:string){return feedback?.section===section?<p className={'pd-feedback'+(feedback.error?' pd-error':'')} role={feedback.error?'alert':'status'}>{!feedback.error&&<CheckCircle2 size={15}/>} {feedback.text}</p>:null;}
 async function send(section:string,payload:Record<string,unknown>,message:string,endpoint='/api/professor/records'){
  if(pending.current)return false;pending.current=true;setBusy(section);setFeedback(null);
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,courseId:course.id,studentId:student.id})});
   const json=await response.json();if(!response.ok||!json.ok)throw Error(json.error||'Operação não confirmada.');
   setFeedback({section,text:message,error:false});await refresh();return true;
  }catch(e){setFeedback({section,text:e instanceof Error?e.message:'Falha na comunicação.',error:true});return false;}
  finally{pending.current=false;setBusy('');}
 }
 async function quick(action:'grades'|'activities'|'honors'|'attendance'|'announcements'|'email'){
  if(pending.current)return;pending.current=true;setBusy('quick-'+action);
  setQuickResults(old=>({...old,[action]:''}));
  try{
   const email=action==='email';
   const endpoint=email?'/api/professor/emails':'/api/professor/apresentacao';
   const payload=email?{courseId:course.id,studentId:student.id,selection:'student',requestId:student.id,subject:'Bem-vindo ao Pandora School',message:'Sua conta está pronta. Consulte suas disciplinas, avaliações, atividades e conquistas no portal do aluno.'}:{studentId:student.id,action};
   const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const json=await response.json();
   if(!response.ok||!json.ok)throw Error(json.error||'Operação não confirmada.');
   const count=Number(json.count??0);
   setQuickResults(old=>({...old,[action]:email?'E-mail encaminhado para processamento; confira o histórico.':json.existing?'Frequência existente preservada.':count===0?'Nenhum registro novo; os existentes foram preservados.':action==='attendance'?'Histórico inicial de 48 dias e 12 semanas registrado.':count+' '+(count===1?'registro adicionado':'registros adicionados')+'.'}));
   if(action==='honors'||action==='attendance')setDetailVersion(v=>v+1);
   await refresh();
  }catch(e){setQuickResults(old=>({...old,[action]:'Erro: '+(e instanceof Error?e.message:'Falha na comunicação.')}));}
  finally{pending.current=false;setBusy('');}
 }
 const quickActions=[
  {id:'grades' as const,title:'Adicionar notas',description:subjects.length?subjects.length+' matérias · notas de exemplo entre 7,5 e 10':'Sem matérias cadastradas',icon:GraduationCap,disabled:!subjects.length},
  {id:'activities' as const,title:'Adicionar atividades',description:subjects.length+' atividades + Projeto T',icon:ClipboardList,disabled:false},
  {id:'honors' as const,title:'Conceder honrarias',description:'Excelência, Colaboração e Superação',icon:Award,disabled:false},
  {id:'attendance' as const,title:'Adicionar frequência',description:'48 dias · 12 semanas de histórico inicial',icon:CalendarCheck,disabled:false},
  {id:'announcements' as const,title:'Adicionar comunicados',description:'2 avisos individuais',icon:Bell,disabled:false},
  {id:'email' as const,title:'Enviar boas-vindas',description:'1 e-mail real para o aluno selecionado',icon:Mail,disabled:!student.email},
 ];
 const subjectOptions=<><option value="">Avaliação geral / sem matéria</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</>;
 const gradeSelect=(id:string)=>{setGradeId(id);const g=grades.find(g=>g.id===id);setAssessment(g?.assessment??'');setScore(g?String(g.score):'');setGradeSubject(g?.subject_id??'');};
 const activitySelect=(id:string)=>{setActivityId(id);const a=activities.find(a=>a.id===id);setActivityTitle(a?.title??'');setActivityBody(a?.body??'');setActivitySubject(a?.subject_id??'');setCategory(a?.category??'project');setDueAt(a?brasiliaInput(a.due_at):brasiliaInput(new Date(Date.now()+86400000)));};
 async function submitGrade(e:FormEvent){e.preventDefault();if(!score.trim()||!Number.isFinite(Number(score)))return;if(await send('grade',{kind:'grade',gradeId,subjectId:gradeSubject,assessment,score:Number(score)},'Nota registrada. A notificação é gerada pelo banco; o e-mail entra na fila.'))gradeSelect('');}
 async function submitActivity(e:FormEvent){e.preventDefault();if(await send('activity',{kind:activityId?'activity_update':'activity',activityId,subjectId:activitySubject,title:activityTitle,body:activityBody,dueAt,category},'Atividade salva na conta selecionada.'))activitySelect('');}
 async function submitNotice(e:FormEvent){e.preventDefault();if(await send('notice',{kind:'announcement',title:noticeTitle,body:noticeBody},'Comunicado publicado para este aluno.')){setNoticeTitle('');setNoticeBody('');}}
 async function submitEmail(e:FormEvent){e.preventDefault();if(!window.confirm('Enviar este e-mail real para '+(student.email||student.display_name)+'?'))return;const requestId=emailRequest||crypto.randomUUID();setEmailRequest(requestId);if(await send('email',{selection:'student',requestId,subject:emailTitle,message:emailBody},'E-mail colocado na fila; a entrega depende do provedor.','/api/professor/emails')){setEmailTitle('');setEmailBody('');setEmailRequest('');}}
 return <>
 <div className="pd-student"><div className="pd-avatar">{student.display_name.trim().slice(0,1).toUpperCase()}</div><div className="pd-student-name"><strong>{student.display_name}</strong><span>{course.title} · {student.email||'E-mail indisponível'}</span></div><span className="pd-online" data-online={online===true}>{online===null?'Status não consultado':online?'Online no portal':'Offline'}</span></div>
 <div className="pd-stats"><span><strong>{grades.length}</strong>Notas</span><span><strong>{activities.length}</strong>Atividades</span><span><strong>{activities.filter(a=>!!a.submitted_at).length}</strong>Entregas</span><span><strong>{announcements.length}</strong>Avisos individuais</span></div>
 <section className="pd-quick" aria-labelledby="pd-quick-title"><div className="pd-quick-heading"><div><span className="pd-overline"><Zap size={14}/> Dinâmica ao vivo</span><h3 id="pd-quick-title">Preencher por etapa</h3><p>Um clique por categoria, exclusivamente na conta selecionada. Os valores de apresentação não substituem registros existentes.</p></div></div><div className="pd-quick-grid">{quickActions.map(a=><div key={a.id} className="pd-quick-item"><button type="button" className="pd-quick-button" disabled={!!busy||a.disabled} onClick={()=>void quick(a.id)}><span className="pd-quick-icon">{busy==='quick-'+a.id?<Loader2 size={22} className="animate-spin"/>:<a.icon size={22}/>}</span><span><strong>{a.title}</strong><small>{a.description}</small></span><span className="pd-quick-arrow" aria-hidden="true">+</span></button>{quickResults[a.id]&&<p role={quickResults[a.id].startsWith('Erro:')?'alert':'status'} className={'pd-quick-result'+(quickResults[a.id].startsWith('Erro:')?' pd-error':'')}>{quickResults[a.id]}</p>}</div>)}</div><p className="pd-quick-note">A patente Bronze é liberada quando o aluno envia uma atividade. Honrarias são independentes. Os dados acadêmicos de exemplo são gravados no banco real; use somente na conta da dinâmica.</p></section>
 <details className="pd-manual"><summary>Gerenciar registros individualmente</summary>
 <div className="pd-grid">
  <Panel title="Notas e avaliações" icon={<GraduationCap size={20}/>}>
   <form className="pd-form" onSubmit={submitGrade}><label>Registro<select className={field} value={gradeId} onChange={e=>gradeSelect(e.target.value)}><option value="">Nova nota</option>{grades.map(g=><option key={g.id} value={g.id}>{g.assessment} · {Number(g.score).toFixed(2)}</option>)}</select></label><label>Matéria<select className={field} disabled={!!gradeId} value={gradeSubject} onChange={e=>setGradeSubject(e.target.value)}>{subjectOptions}</select></label><label>Avaliação<input className={field} required minLength={2} maxLength={80} readOnly={!!gradeId} value={assessment} onChange={e=>setAssessment(e.target.value)} placeholder="Ex.: Projeto T"/></label><label>Nota (0 a 10)<input className={field} required type="number" min="0" max="10" step=".01" value={score} onChange={e=>setScore(e.target.value)}/></label><Submit busy={!!busy}>{gradeId?'Atualizar nota':'Publicar nota'}</Submit></form>{result('grade')}
   {grades.length>0&&<details className="pd-history"><summary>Notas registradas ({grades.length})</summary>{grades.map(g=><div className="pd-history-row" key={g.id}><span>{g.assessment}</span><strong>{Number(g.score).toFixed(2)}</strong><button type="button" disabled={!!busy} className="teacher-record-link" onClick={()=>void send('grade',{kind:'grade_email_retry',gradeId:g.id},'Verificação e reenvio de e-mail solicitados.')}>Reenviar e-mail</button></div>)}</details>}
  </Panel>
  <Panel title="Medalhas e reconhecimento" icon={<Award size={20}/>}><p className="pd-hint">Honrarias são concedidas pela direção. A patente evolui automaticamente pelas entregas reais.</p><DirectorHonors key={detailVersion} studentId={student.linked_user_id!}/></Panel>
  <Panel title="Frequência e sequência" icon={<CalendarCheck size={20}/>}><DirectorAttendance key={detailVersion} studentId={student.linked_user_id!}/></Panel>
  <Panel title="Atividades e projetos" icon={<ClipboardList size={20}/>}>
   <form className="pd-form" onSubmit={submitActivity}><label>Registro<select className={field} value={activityId} onChange={e=>activitySelect(e.target.value)}><option value="">Nova atividade</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title} · {activityStatuses[a.status]}</option>)}</select></label><label>Matéria<select className={field} value={activitySubject} onChange={e=>setActivitySubject(e.target.value)}>{subjectOptions}</select></label><label>Tipo<select className={field} value={category} onChange={e=>setCategory(e.target.value==='project'?'project':'activity')}><option value="project">Projeto</option><option value="activity">Atividade</option></select></label><label>Título<input className={field} required minLength={3} maxLength={140} value={activityTitle} onChange={e=>setActivityTitle(e.target.value)} placeholder="Título (mínimo de 3 caracteres)"/></label><label>Orientações<textarea className={field} required minLength={3} maxLength={5000} rows={3} value={activityBody} onChange={e=>setActivityBody(e.target.value)}/></label><label>Prazo (Brasília)<input className={field} required type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/></label><Submit busy={!!busy}>{activityId?'Salvar atividade':'Publicar para o aluno'}</Submit></form>{result('activity')}
   {activities.length>0&&<details className="pd-history"><summary>Entregas e correções ({activities.length})</summary>{activities.map(a=><article className="pd-work" key={a.id}><strong>{a.title}</strong><p>{activityStatuses[a.status]} · {brasiliaLabel(a.due_at)}</p>{a.submission_text&&<><p className="whitespace-pre-wrap break-words">{a.submission_text}</p>{a.submission_url&&<a href={a.submission_url} target="_blank" rel="noopener noreferrer" className="teacher-record-link">Abrir link</a>}{a.attachment_path&&<a href={'/api/arquivos/entregas?atividade='+a.id} target="_blank" rel="noopener noreferrer" className="teacher-record-link">Baixar anexo</a>}<TeacherSubmissionReview activity={a} onSaved={()=>void refresh()}/></>}{a.status==='reviewed'&&<TeacherCompetencies activityId={a.id} rows={data.competencies?.filter(c=>c.activity_id===a.id)} onSaved={()=>void refresh()}/>}</article>)}</details>}
  </Panel>
  <Panel title="Comunicado individual" icon={<Bell size={20}/>}><form className="pd-form" onSubmit={submitNotice}><label>Título<input className={field} required minLength={2} maxLength={140} value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)}/></label><label>Mensagem<textarea className={field} required minLength={2} maxLength={2000} rows={3} value={noticeBody} onChange={e=>setNoticeBody(e.target.value)}/></label><Submit busy={!!busy}>Publicar comunicado</Submit></form>{result('notice')}{announcements.length>0&&<details className="pd-history"><summary>Avisos anteriores ({announcements.length})</summary>{announcements.map(a=><article className="pd-work" key={a.id}><strong>{a.title}</strong><p className="break-words">{a.body}</p></article>)}</details>}</Panel>
  <Panel title="E-mail individual" icon={<Mail size={20}/>}><p className="pd-hint">Destinatário: {student.email||'conta sem e-mail disponível'}. Exige endereço confirmado.</p><form className="pd-form" onSubmit={submitEmail}><label>Assunto<input className={field} required minLength={4} maxLength={120} value={emailTitle} onChange={e=>{setEmailTitle(e.target.value);setEmailRequest('');}}/></label><label>Mensagem<textarea className={field} required minLength={10} maxLength={2500} rows={3} value={emailBody} onChange={e=>{setEmailBody(e.target.value);setEmailRequest('');}}/></label><Submit busy={!!busy||!student.email}>Enviar e-mail</Submit></form>{result('email')}</Panel>
  <Panel title="Materiais da formação" icon={<BookOpen size={20}/>}><p className="pd-hint">Materiais são compartilhados com toda a formação, não apenas com o aluno selecionado.</p><form className="pd-form" onSubmit={async e=>{e.preventDefault();if(!window.confirm('Publicar material para toda a formação '+course.title+'?'))return;if(await send('material',{kind:'material',title:materialTitle,body:materialBody},'Material publicado na formação.')){setMaterialTitle('');setMaterialBody('');}}}><label>Título<input className={field} required minLength={2} maxLength={140} value={materialTitle} onChange={e=>setMaterialTitle(e.target.value)}/></label><label>Conteúdo<textarea className={field} required minLength={2} maxLength={5000} rows={3} value={materialBody} onChange={e=>setMaterialBody(e.target.value)}/></label><Submit busy={!!busy}>Publicar material</Submit></form>{result('material')}{materials.length>0&&<details className="pd-history"><summary>Materiais publicados ({materials.length})</summary>{materials.map(m=><article className="pd-work" key={m.id}><strong>{m.title}</strong><TeacherMaterialUpload materialId={m.id} courseId={m.course_id} filePath={m.file_path??null} onSaved={()=>void refresh()}/></article>)}</details>}</Panel>
 </div>
 </details>
 </>;
}
