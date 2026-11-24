'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {CalendarCheck, Check, Info, X, Flame} from 'lucide-react';
import {brazilDay,previousDay,type AttendanceData} from '@/lib/attendance';
import {prefereMenosMovimento} from '@/lib/movimento';
import '@/styles/attendance.css';

function useAttendance(studentId?:string){
 const [data,setData]=useState<AttendanceData|null>(null);
 const [error,setError]=useState('');
 const generation=useRef(0);
 const reload=useCallback(async()=>{
  const version=++generation.current;
  try{
   const res=await fetch('/api/aluno/frequencia'+(studentId?'?studentId='+encodeURIComponent(studentId):''),{credentials:'same-origin',cache:'no-store'});
   const json=await res.json();
   if(version!==generation.current)return false;
   if(!res.ok||!json.ok)throw Error(json.error||'Frequência indisponível.');
   setData(json);setError('');return true;
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Frequência indisponível.');return false;}
 },[studentId]);
 useEffect(()=>{
  setData(null);void reload();
  const focus=()=>{if(document.visibilityState==='visible')void reload();};
  const timer=window.setInterval(focus,5000);
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{++generation.current;window.clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[reload]);
 return {data,error,reload};
}
function FlameMedal({active}:{active:boolean}){
 const id=useId().replace(/:/g,'');
 return <svg viewBox="0 0 160 184" className="attendance-flame" aria-hidden="true">
  <defs>
   <linearGradient id={id+'rim'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={active?'#fff3b8':'#b3aaa0'}/><stop offset=".32" stopColor={active?'#e7ac53':'#77706a'}/><stop offset=".63" stopColor={active?'#8b451d':'#433d39'}/><stop offset="1" stopColor={active?'#ffd692':'#a69e95'}/></linearGradient>
   <linearGradient id={id+'face'} x1="0" y1="0" x2=".95" y2="1"><stop stopColor={active?'#fff6cf':'#e4d9c7'}/><stop offset=".4" stopColor={active?'#f8b95f':'#9b9389'}/><stop offset=".76" stopColor={active?'#bc5b31':'#68605a'}/><stop offset="1" stopColor={active?'#f6a748':'#8e8378'}/></linearGradient>
   <linearGradient id={id+'inner'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={active?'#ffde86':'#b5aba0'}/><stop offset=".55" stopColor={active?'#d35d39':'#79716b'}/><stop offset="1" stopColor={active?'#843226':'#524b47'}/></linearGradient>
  </defs>
  <g transform="translate(5 7)" fill={'url(#'+id+'rim)'}><path d="M75 7C124 42 151 85 140 127C133 157 110 174 80 174C44 174 16 149 16 116C16 86 39 72 44 51C51 63 54 75 50 85C80 64 86 37 75 7Z"/></g>
  <path d="M75 7C124 42 151 85 140 127C133 157 110 174 80 174C44 174 16 149 16 116C16 86 39 72 44 51C51 63 54 75 50 85C80 64 86 37 75 7Z" fill={'url(#'+id+'face)'} stroke={'url(#'+id+'rim)'} strokeWidth="3"/>
  <path d="M82 24C107 53 120 82 113 105C109 119 102 124 96 129C102 104 90 92 78 82C83 112 56 114 55 138C55 152 67 162 82 162C105 162 125 146 130 121C136 88 113 51 82 24Z" fill={'url(#'+id+'inner)'}/>
  <path d="M77 115C67 134 71 146 84 149C96 146 101 136 93 124C88 130 85 132 83 132C85 124 80 118 77 115Z" fill={active?'#5c1d21':'#4d4743'}/>
  <path d="M77 13C86 45 65 73 50 85M44 59C43 77 23 94 23 115C22 147 47 166 72 168" fill="none" stroke="#fff8df" strokeOpacity=".73" strokeWidth="2.2" strokeLinecap="round"/>
  {active&&<g fill="#fff1b3"><path d="M139 25l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/><path d="M18 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><path d="M147 145l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>}
 </svg>;
}
export default function AttendancePanel(){
 const {data,error,reload}=useAttendance();
 const [info,setInfo]=useState(false);
 const [pulse,setPulse]=useState(0);
 const previous=useRef<number|null>(null);
 const count=data?.streak.days;
 useEffect(()=>{if(count===undefined)return;if(previous.current!==null&&count>previous.current&&!prefereMenosMovimento())setPulse(v=>v+1);previous.current=count;},[count]);
 return <section className="attendance-panel" aria-labelledby="attendance-title">
  <div className="attendance-top"><h2 id="attendance-title"><CalendarCheck size={17}/> Frequência acadêmica</h2><button type="button" aria-label="Como funciona a sequência" aria-expanded={info} onClick={()=>setInfo(v=>!v)}><Info size={20}/></button></div>
  {error&&<p role="alert" className="attendance-error">{error} <button type="button" onClick={()=>void reload()}>Tentar novamente</button></p>}
  {!data&&!error&&<p className="attendance-status" role="status">Consultando sua frequência…</p>}
  {data&&<>
   <div className="attendance-hero" data-active={data.streak.days>0?'true':'false'}>
    <div className="attendance-copy">
     <p className="attendance-kicker">Sequência sem faltas</p>
     <div className="attendance-number" aria-live="polite" key={pulse}>{data.streak.weeks}<span> {data.streak.weeks===1?'semana':'semanas'}</span></div>
     <p className="attendance-days">{data.streak.days} {data.streak.days===1?'dia de presença':'dias de presença'} registrados</p>
     <div className="attendance-marks" aria-label="Últimos registros">{[...data.days.slice(0,5)].reverse().map(d=><span key={d.attendance_date} title={d.attendance_date+(d.status==='present'?' · Presença':' · Falta')} data-absent={d.status==='absent'}>{d.status==='present'?<Check size={15}/>:<X size={15}/>}</span>)}</div>
    </div>
    <div className={pulse?'attendance-medal attendance-celebrate':'attendance-medal'} key={'medal-'+pulse}><FlameMedal active={data.streak.days>0}/></div>
   </div>
   {data.streak.historical&&<p className="attendance-status">Inclui histórico inicial informado pela direção (não verificado por chamada diária).</p>}
   {!data.streak.days&&<p className="attendance-status">Sua próxima presença inicia uma nova sequência.</p>}
  </>}
  {info&&<div className="attendance-explain"><p>Uma presença por dia de aula conta uma vez. Uma falta registrada reinicia a sequência. Dias sem chamada, feriados e fins de semana não são faltas automáticas.</p><p>Semanas são semanas consecutivas com presença registrada, incluindo a semana atual; não significam que todos os dias letivos foram conferidos. Um intervalo sem registros não gera semanas extras.</p></div>}
 </section>;
}
export function DirectorAttendance({studentId}:{studentId:string}){
 const {data,error,reload}=useAttendance(studentId);
 const [date,setDate]=useState(()=>brazilDay());
 const [historyDate,setHistoryDate]=useState(()=>previousDay(brazilDay()));
 const [days,setDays]=useState('');
 const [weeks,setWeeks]=useState('');
 const [showHistory,setShowHistory]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function save(action:string,values:Record<string,unknown>={}){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/aluno/frequencia',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId,action,...values})});
   const json=await r.json();if(!r.ok||!json.ok)throw Error(json.error||'Não foi possível salvar.');
   const refreshed=await reload();setMessage(refreshed?'Frequência atualizada.':'Registro salvo; atualize para consultar.');
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar.');}finally{setBusy(false);}
 }
 return <section className="attendance-director mt-4 rounded-xl border border-border bg-background p-4">
  <h4 className="flex items-center gap-2 text-sm font-bold text-foreground"><Flame size={17}/> Frequência e sequência</h4>
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  {data&&<p className="mt-2 text-xs text-muted-foreground">{data.streak.days} dias de presença · {data.streak.weeks} semanas{data.streak.historical?' · inclui histórico informado':''}</p>}
  <label className="mt-3 block text-xs font-bold text-foreground">Data da chamada<input className="teacher-field mt-1 w-full" type="date" min="2000-01-01" max={data?.today??brazilDay()} value={date} onChange={e=>setDate(e.target.value)}/></label>
  <div className="mt-2 flex flex-wrap gap-2">
   <button type="button" disabled={busy||!date} className="attendance-mark-button" onClick={()=>void save('record',{date,status:'present'})}><Check size={16}/> Presente</button>
   <button type="button" disabled={busy||!date} className="attendance-mark-button attendance-mark-absent" onClick={()=>void save('record',{date,status:'absent'})}><X size={16}/> Falta</button>
  </div>
  {data?.days.find(d=>d.attendance_date===date)&&<p className="mt-2 text-xs text-muted-foreground">Registro atual: {data.days.find(d=>d.attendance_date===date)?.status==='present'?'Presente':'Falta'}. Alterar substitui o registro do dia.</p>}
  <button type="button" className="mt-3 text-xs font-bold text-primary underline" aria-expanded={showHistory} onClick={()=>{if(!showHistory&&data?.baseline){setHistoryDate(data.baseline.through_date);setDays(String(data.baseline.days));setWeeks(String(data.baseline.weeks));}setShowHistory(v=>!v);}}> {showHistory?'Ocultar histórico inicial':'Definir histórico inicial'}</button>
  {showHistory&&<form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();void save('baseline',{date:historyDate,days:Number(days),weeks:Number(weeks)});}}>
   <p className="text-xs text-muted-foreground">Use para importar uma sequência anterior ou demonstrar o recurso. O aluno verá que o histórico foi informado pela direção. Não cria chamadas antigas.</p>
   <label className="block text-xs font-bold text-foreground">Histórico até<input className="teacher-field mt-1 w-full" required type="date" min="2000-01-01" max={previousDay(data?.today??brazilDay())} value={historyDate} onChange={e=>setHistoryDate(e.target.value)}/></label>
   <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-foreground">Dias sem falta<input className="teacher-field mt-1 w-full" required type="number" min="1" max="1000" value={days} onChange={e=>setDays(e.target.value)}/></label><label className="text-xs font-bold text-foreground">Semanas<input className="teacher-field mt-1 w-full" required type="number" min="0" max="156" value={weeks} onChange={e=>setWeeks(e.target.value)}/></label></div>
   <div className="flex flex-wrap gap-2"><button className="attendance-mark-button" type="submit" disabled={busy}>Salvar histórico</button>{data?.baseline&&<button type="button" disabled={busy} className="attendance-mark-button attendance-mark-absent" onClick={()=>void save('clear-baseline')}>Retirar histórico</button>}</div>
  </form>}
  {message&&<p role="status" className="mt-3 text-xs text-foreground">{message}</p>}
 </section>;
}
