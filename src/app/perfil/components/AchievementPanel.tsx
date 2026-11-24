'use client';
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Info, LockKeyhole, Award } from 'lucide-react';
import { achievementRank, RANKS, HONORS, type AchievementData, type HonorKind } from '@/lib/achievements';
import { prefereMenosMovimento } from '@/lib/movimento';
import '@/styles/achievements.css';

const shield='M100 14 156 43 156 111 139 148 100 181 61 148 44 111 44 43Z';
function Medal({index}: {index:number}) {
 const id=useId().replace(/:/g,'');
 const rank=RANKS[index];
 const ref=useRef<HTMLDivElement>(null);
 function tilt(e:PointerEvent<HTMLDivElement>){
  if(prefereMenosMovimento()||e.pointerType!=='mouse'||!ref.current)return;
  const r=e.currentTarget.getBoundingClientRect();
  if(!r.width||!r.height)return;
  ref.current.style.setProperty('--rx',((.5-(e.clientY-r.top)/r.height)*22)+'deg');
  ref.current.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*28)+'deg');
 }
 function reset(){ref.current?.style.setProperty('--rx','0deg');ref.current?.style.setProperty('--ry','0deg');}
 return <div className="achievement-scene" onPointerMove={tilt} onPointerLeave={reset} aria-hidden="true" style={{'--medal-color':rank.metal,'--medal-glow':rank.jewel} as CSSProperties}>
  <div className="achievement-shadow"/>
  {index===0?<div className="achievement-locked"><LockKeyhole size={38} strokeWidth={1.4}/></div>:
  <div ref={ref} className="achievement-medal" style={{'--medal-scale':String(.85+index*.035)} as CSSProperties}>
   {Array.from({length:7},(_,i)=><svg key={i} viewBox="0 0 200 200" className="achievement-layer" style={{transform:'translateZ('+(-12+i*2)+'px)'}}><path d={shield} fill={i%2?rank.dark:rank.metal} stroke={rank.dark} strokeWidth="2"/></svg>)}
   <svg viewBox="0 0 200 200" className="achievement-layer achievement-face">
    <defs>
     <linearGradient id={id+'metal'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={rank.light}/><stop offset=".24" stopColor={rank.metal}/><stop offset=".52" stopColor={rank.dark}/><stop offset=".72" stopColor={rank.metal}/><stop offset="1" stopColor={rank.light}/></linearGradient>
     <linearGradient id={id+'gem'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={rank.light}/><stop offset=".45" stopColor={rank.jewel}/><stop offset="1" stopColor={rank.dark}/></linearGradient>
     <radialGradient id={id+'core'}><stop stopColor={rank.dark}/><stop offset="1" stopColor="#14151c"/></radialGradient>
    </defs>
    {index>=2&&<g fill={'url(#'+id+'metal)'} stroke={rank.light} strokeWidth=".7">
      <path d="M45 64 8 42 25 92 46 110 54 91Z"/><path d="M155 64 192 42 175 92 154 110 146 91Z"/>
      {index>=4&&<><path d="M40 108 11 91 24 135 62 153 54 130Z"/><path d="M160 108 189 91 176 135 138 153 146 130Z"/></>}
     </g>}
    {index>=5&&<g fill={'url(#'+id+'gem)'} stroke={rank.light} strokeWidth="1"><path d="M100 2 115 22 100 41 85 22Z"/><path d="M100 166 114 182 100 198 86 182Z"/></g>}
    <path d={shield} fill={'url(#'+id+'metal)'} stroke={rank.light} strokeWidth="1.5"/>
    <path d="M100 27 144 50 144 108 130 139 100 166 70 139 56 108 56 50Z" fill={'url(#'+id+'core)'} stroke={rank.dark} strokeWidth="3"/>
    <path d="M100 34 136 53 136 106 123 133 100 154 77 133 64 106 64 53Z" fill="none" stroke={rank.metal} strokeWidth="1.4"/>
    {index>=3&&<path d="M66 60 100 44 134 60 100 52Z M69 120 100 143 131 120 100 134Z" fill={rank.metal} opacity=".9"/>}
    <path d="M100 52 126 87 100 125 74 87Z" fill={'url(#'+id+'gem)'} stroke={rank.light} strokeWidth="1.2"/>
    <path d="M100 52 100 86 74 87Z" fill={rank.light} opacity=".7"/>
    <path d="M126 87 100 86 100 125Z" fill={rank.dark} opacity=".6"/>
    <path d="M100 67 115 87 100 109 85 87Z" fill="#14151c" opacity=".72"/>
    <path d="M92 89 92 81 100 75 108 81 108 94 100 100 92 94" fill="none" stroke={rank.light} strokeWidth="2.5" strokeLinejoin="round"/>
    {Array.from({length:index},(_,i)=><circle key={i} cx={100+(i-(index-1)/2)*10} cy="137" r="2.6" fill={rank.light}/>)}
    {index===6&&<g fill="none" stroke={rank.jewel} strokeWidth="1.2"><path d="M39 46 23 30 40 13 55 28M161 46 177 30 160 13 145 28"/><path d="M59 150 44 169 69 181M141 150 156 169 131 181"/></g>}
   </svg>
  </div>}
 </div>;
}
function useAchievement(studentId?:string){
 const [data,setData]=useState<AchievementData|null>(null);
 const [error,setError]=useState('');
 const generation=useRef(0);
 const reload=useCallback(async()=>{
  const version=++generation.current;
  try{
   const r=await fetch('/api/aluno/conquistas'+(studentId?'?studentId='+encodeURIComponent(studentId):''),{cache:'no-store',credentials:'same-origin'});
   const json=await r.json();
   if(version!==generation.current)return;
   if(!r.ok||!json.ok)throw Error(json.error||'Conquistas indisponíveis.');
   setData({count:json.count,honors:json.honors});setError('');
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Conquistas indisponíveis.');}
 },[studentId]);
 useEffect(()=>{
  setData(null);void reload();
  const onFocus=()=>{if(document.visibilityState==='visible')void reload();};
  const timer=window.setInterval(onFocus,15000);
  window.addEventListener('focus',onFocus);
  window.addEventListener('pandora:academic-records-refresh',onFocus);
  document.addEventListener('visibilitychange',onFocus);
  return()=>{++generation.current;window.clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('pandora:academic-records-refresh',onFocus);document.removeEventListener('visibilitychange',onFocus);};
 },[reload]);
 return {data,error,reload};
}
export default function AchievementPanel(){
 const {data,error,reload}=useAchievement();
 const [info,setInfo]=useState(false);
 const [celebrate,setCelebrate]=useState(false);
 const previous=useRef<number|null>(null);
 const current=data?achievementRank(data.count):null;
 const index=current?.index;
 useEffect(()=>{
  if(index===undefined)return;
  if(previous.current!==null&&index>previous.current&&!prefereMenosMovimento()){setCelebrate(true);const t=window.setTimeout(()=>setCelebrate(false),1300);previous.current=index;return()=>window.clearTimeout(t);}
  previous.current=index;
 },[index]);
 return <section className="achievement-panel mt-3 rounded-[28px] border border-border bg-card p-5 sm:p-7" aria-labelledby="achievement-title">
  <header className="flex items-center justify-between gap-3">
   <h2 id="achievement-title" className="font-display text-xl font-bold text-foreground">Conquistas</h2>
   <button type="button" onClick={()=>setInfo(v=>!v)} aria-label="Como evoluir a medalha" aria-expanded={info} className="achievement-info"><Info size={19}/></button>
  </header>
  {info&&<div className="achievement-guide mt-3 rounded-xl border border-border bg-background p-4 text-sm text-foreground">
   <p>Uma atividade ou projeto entregue conta uma vez. Reenvios não somam pontos extras. Honrarias da direção são separadas da patente.</p>
   <ol className="mt-3 space-y-1">{RANKS.slice(1).map(r=><li key={r.min} className="flex justify-between gap-2"><span>{r.name}</span><strong>{r.min} {r.min===1?'entrega':'entregas'}</strong></li>)}</ol>
  </div>}
  {error&&<p role="alert" className="mt-4 text-sm text-destructive">{error} <button type="button" onClick={()=>void reload()} className="underline">Tentar novamente</button></p>}
  {!current||!data?<p role="status" className="mt-4 text-sm text-muted-foreground">{error?'':'Carregando sua progressão…'}</p>:<>
   <div className={celebrate?'achievement-rise':''} key={current.index}><Medal index={current.index}/></div>
   <div aria-live="polite" className="text-center">
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Patente acadêmica</p>
    <h3 className="mt-1 font-display text-3xl font-bold text-foreground">{current.rank.name}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{current.rank.detail}</p>
   </div>
   <div className="mt-5"><div className="mb-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>{data.count} {data.count===1?'entrega':'entregas'}</span><strong>{current.next?'Próxima: '+current.next.name:'Nível máximo'}</strong></div>
    <div className="achievement-progress" role="progressbar" aria-label="Progresso até a próxima patente" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(current.progress)}><span style={{width:current.progress+'%',background:current.rank.metal}}/></div>
    {current.next&&<p className="mt-2 text-xs text-muted-foreground">Faltam {current.next.min-data.count} {current.next.min-data.count===1?'entrega':'entregas'}.</p>}
   </div>
   <div className="mt-5 border-t border-border pt-4"><h4 className="text-sm font-bold text-foreground">Honrarias da direção</h4>
    {data.honors.length? <div className="mt-3 flex flex-wrap gap-2">{data.honors.map(h=><span key={h.kind} className="achievement-honor"><Award size={17}/>{HONORS.find(x=>x.kind===h.kind)?.label}</span>)}</div>:<p className="mt-2 text-xs text-muted-foreground">Nenhuma honraria concedida até agora.</p>}
   </div>
  </>}
 </section>;
}
export function DirectorHonors({studentId}:{studentId:string}){
 const {data,error,reload}=useAchievement(studentId);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function change(kind:HonorKind,grant:boolean){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/aluno/conquistas',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId,kind,action:grant?'grant':'revoke'})});
   const json=await r.json();if(!r.ok||!json.ok)throw Error(json.error||'Operação não concluída.');
   await reload();setMessage(grant?'Honraria concedida.':'Honraria retirada.');
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao atualizar.');}finally{setBusy(false);}
 }
 return <section className="mt-4 rounded-xl border border-border bg-background p-4">
  <h4 className="flex items-center gap-2 text-sm font-bold text-foreground"><Award size={17}/> Conquistas e honrarias</h4>
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  {data?<><p className="mt-2 text-xs text-muted-foreground">{data.count} entregas · {achievementRank(data.count).rank.name}</p>
   <div className="mt-3 space-y-2">{HONORS.map(h=>{const earned=data.honors.some(x=>x.kind===h.kind);return <div key={h.kind} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"><div className="min-w-0"><strong className="text-sm text-foreground">{h.label}</strong><p className="text-xs text-muted-foreground">{h.description}</p></div><button type="button" disabled={busy} onClick={()=>void change(h.kind,!earned)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50">{earned?'Retirar':'Conceder'}</button></div>;})}</div></>:!error?<p className="mt-2 text-xs text-muted-foreground">Carregando…</p>:null}
  {message&&<p role="status" className="mt-3 text-xs text-foreground">{message}</p>}
 </section>;
}
