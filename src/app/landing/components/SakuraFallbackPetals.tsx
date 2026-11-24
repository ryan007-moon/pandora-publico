import type { CSSProperties } from 'react';

/** Decorative fallback only; the real scene uses a single shared WebGL canvas. */
export default function SakuraFallbackPetals() {
  return (
    <div className="sakura-fallback-petals" aria-hidden="true">
      {Array.from({length:14}, (_,i) => {
        const seed=(i*37+11)%97;
        return <span key={i} style={{
          '--petal-left': `${4+(i*43)%92}%`,
          '--petal-size': `${4+(i*7)%6}px`,
          '--petal-duration': `${8+(seed%11)*.47}s`,
          '--petal-delay': `${-((i*73)%137)/10}s`,
        } as CSSProperties} />;
      })}
    </div>
  );
}
