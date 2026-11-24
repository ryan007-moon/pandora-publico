'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { disciplinas, NOTA_CORTE, formatarNota } from '@/lib/data';

const chartData = disciplinas.map((d) => ({
  id: d.id,
  nome: d.nomeCurto,
  nota: d.nota,
}));

interface TooltipPayloadItem {
  value: number;
  payload: { nome: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-secondary-foreground shadow-card">
      <p className="font-mono-data text-[11px] uppercase tracking-wider">{item.payload.nome}</p>
      <p className="tabular font-display text-xl font-semibold">{formatarNota(item.value)}</p>
    </div>
  );
}

export default function NotasChart() {
  return (
    <section
      aria-labelledby="notas-chart-title"
      className="rounded-[28px] border border-border bg-card p-6 shadow-card"
    >
      <p className="eyebrow">Comparativo</p>
      <h2 id="notas-chart-title" className="mt-2 text-2xl text-card-foreground">
        Notas por disciplina vs. nota de corte
      </h2>
      <div className="mt-6 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
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
              domain={[0, 10]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)' }} />
            <ReferenceLine
              x={NOTA_CORTE}
              stroke="var(--destructive)"
              strokeDasharray="5 4"
              label={{
                value: 'Corte 7,0',
                position: 'insideTopRight',
                fill: 'var(--destructive)',
                fontSize: 11,
              }}
            />
            <Bar dataKey="nota" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {chartData.map((entry) => (
                <Cell
                  key={`nota-${entry.id}`}
                  fill={entry.nota >= 9 ? 'var(--primary)' : 'var(--foreground)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
