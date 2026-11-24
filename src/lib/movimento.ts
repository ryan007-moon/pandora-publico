'use client';

/**
 * Helper central de movimento (Etapa 5).
 * "Menos movimento" é verdadeiro quando o sistema do usuário pede
 * (prefers-reduced-motion) OU quando ele ativa a opção na Central de Acessibilidade.
 * Os componentes GSAP/carrosséis consomem estes helpers em vez do matchMedia direto,
 * para que o ajuste manual tenha efeito imediato em todo o portal.
 */

export function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  if (root.dataset.motionPreference === 'full') return false;
  if (root.dataset.motionPreference === 'reduced') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Observa mudanças na preferência de movimento (sistema ou manual). Retorna função de limpeza. */
export function ouvirMudancaMovimento(aoMudar: () => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const aoMudarInterno = () => aoMudar();
  mq.addEventListener('change', aoMudarInterno);
  window.addEventListener('pandora:movimento', aoMudarInterno);
  return () => {
    mq.removeEventListener('change', aoMudarInterno);
    window.removeEventListener('pandora:movimento', aoMudarInterno);
  };
}
