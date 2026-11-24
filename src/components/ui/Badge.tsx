import React from 'react';

type BadgeTone = 'success' | 'warning' | 'neutral' | 'gold' | 'danger' | 'ink';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'border-success/40 text-success',
  warning: 'border-warning/50 text-warning',
  neutral: 'border-border text-muted-foreground',
  gold: 'border-primary bg-primary text-primary-foreground',
  danger: 'border-destructive/50 text-destructive',
  ink: 'border-foreground bg-secondary text-secondary-foreground',
};

export default function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`font-mono-data inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}