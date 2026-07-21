"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type ChartSeries = { key: string; color: string };
export type ChartPoint = { date: string } & Record<string, number | string>;

export function ExperimentChart({
  data,
  series,
  isRate,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  isRate: boolean;
}) {
  const fmtY = (v: number) =>
    isRate ? `${(v * 100).toFixed(0)}%` : v.toLocaleString("pt-BR");

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2D42" />
        <XAxis dataKey="date" stroke="#8296B0" fontSize={11} tickLine={false} />
        <YAxis stroke="#8296B0" fontSize={11} tickLine={false} tickFormatter={fmtY} width={48} />
        <Tooltip
          contentStyle={{
            background: "#0E1623",
            border: "1px solid #1F2D42",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#E8EEF6" }}
          formatter={(v: number) => (isRate ? `${(v * 100).toFixed(1)}%` : v.toLocaleString("pt-BR"))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
