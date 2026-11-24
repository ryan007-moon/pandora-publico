import React from 'react';

interface PageHeaderProps {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  index?: string;
}

// Cabeçalho funcional: contexto sutil, sem réguas douradas ou cápsulas ornamentais.
export default function PageHeader({
  id,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header data-animate className="page-heading portal-page-heading mb-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 id={id} className="portal-page-heading-title text-display-lg text-foreground">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {actions}
      </div>
    </header>
  );
}
