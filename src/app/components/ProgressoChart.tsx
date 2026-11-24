'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { disciplinas } from '@/lib/data';

const chartData = disciplinas.map((d) => ({
  id: d.id,
  nome: d.nomeCurto,
  progresso: d.progresso,
}));

interface TooltipPayloadItem {
  value: number;
  payload: { nome: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-secondary px-3 py-2 shadow-card text-secondary-foreground">
      <p className="font-mono-data text-[11px] uppercase tracking-wider">{item.payload.nome}</p>
      <p className="tabular font-display text-xl font-semibold">{item.value}%</p>
    </div>
  );
}

export default function ProgressoChart() {
  return (
    <section
      aria-labelledby="progresso-title"
      className="h-full rounded-[28px] border border-border bg-card p-6 shadow-card"
    >
      <p className="eyebrow">Semestre 2026.2</p>
      <h2 id="progresso-title" className="mt-2 text-2xl text-card-foreground">
        Progresso por disciplina
      </h2>
      <div className="mt-6 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
            <YAxis
              type="category"
              dataKey="nome"
              width={76}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)' }} />
            <Bar dataKey="progresso" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.id}`}
                  fill={entry.progresso < 70 ? 'var(--foreground)' : 'var(--primary)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Barras em destaque escuro indicam progresso abaixo de 70%. Consulte as próximas atividades
        em Disciplinas.
      </p>
    </section>
  );
}
