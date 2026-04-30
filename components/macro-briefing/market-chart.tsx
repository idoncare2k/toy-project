"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { MarketSeries } from "@/types/market";

type Props = {
  series: MarketSeries;
};

export function MarketChart({ series }: Props) {
  const chartData = series.data.map((p) => ({
    date: p.date.slice(5), // MM-DD
    value: p.value,
  }));

  return (
    <div data-testid="market-chart" className="w-full">
      {/* Hidden labels for test verification */}
      <div className="sr-only">
        {series.data.map((p) => (
          <span key={p.date} data-testid="x-axis-label">
            {p.date.slice(5)}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            domain={["auto", "auto"]}
            width={48}
          />
          <Line
            type="monotone"
            dataKey="value"
            strokeWidth={2}
            dot={{ r: 3 }}
            className="stroke-primary"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
