export const RANKS = [
 { min:0, name:'Não classificado', metal:'#55545a', light:'#8b8992', dark:'#29282e', jewel:'#706d77', detail:'Faça sua primeira entrega para desbloquear a medalha.' },
 { min:1, name:'Bronze', metal:'#ba7548', light:'#f6c99c', dark:'#61331f', jewel:'#d58b52', detail:'A primeira entrega marca o início da jornada.' },
 { min:3, name:'Prata', metal:'#aebdcc', light:'#f1f6ff', dark:'#4b5b70', jewel:'#94a8c8', detail:'Consistência nas entregas.' },
 { min:7, name:'Ouro', metal:'#e8ae35', light:'#fff1ac', dark:'#83501b', jewel:'#ffcc53', detail:'Uma rotina acadêmica consolidada.' },
 { min:12, name:'Platina', metal:'#66b9b9', light:'#d9fff9', dark:'#29586a', jewel:'#52eddf', detail:'Compromisso de longo prazo.' },
 { min:20, name:'Diamante', metal:'#829ee9', light:'#e6efff', dark:'#414582', jewel:'#93d9ff', detail:'Desempenho consistente em muitas entregas.' },
 { min:35, name:'Pandora', metal:'#dfb65b', light:'#fff6cb', dark:'#66418b', jewel:'#c99aff', detail:'O nível máximo de progressão por entregas.' },
] as const;
export const HONORS = [
 {kind:'excelencia', label:'Excelência', description:'Qualidade excepcional no trabalho.'},
 {kind:'colaboracao', label:'Colaboração', description:'Contribuição especial para a turma.'},
 {kind:'evolucao', label:'Superação', description:'Evolução acadêmica reconhecida pela direção.'},
] as const;
export type HonorKind = typeof HONORS[number]['kind'];
export type AchievementData = {count:number; honors:{kind:HonorKind;created_at:string}[]};
export function achievementRank(count:number) {
 const index=RANKS.reduce((last,rank,i)=>count>=rank.min?i:last,0);
 const rank=RANKS[index], next=RANKS[index+1];
 return {index,rank,next,progress:next?Math.max(0,Math.min(100,(count-rank.min)/(next.min-rank.min)*100)):100};
}
