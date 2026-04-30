import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketChart } from "./market-chart";
import type { MarketSeries } from "@/types/market";

const series: MarketSeries = {
  symbol: "^TNX",
  label: "미국채 10년물 금리",
  unit: "%",
  lastUpdated: "2026-04-30T07:00:00.000Z",
  data: [
    { date: "2026-04-22", value: 4.42 },
    { date: "2026-04-23", value: 4.45 },
    { date: "2026-04-24", value: 4.48 },
    { date: "2026-04-25", value: 4.51 },
    { date: "2026-04-28", value: 4.49 },
    { date: "2026-04-29", value: 4.52 },
    { date: "2026-04-30", value: 4.51 },
  ],
};

describe("MarketChart", () => {
  it("renders a chart container when given 7 data points", () => {
    render(<MarketChart series={series} />);
    const container = screen.getByTestId("market-chart");
    expect(container).toBeTruthy();
  });

  it("renders 7 x-axis date labels", () => {
    render(<MarketChart series={series} />);
    const labels = screen.getAllByTestId("x-axis-label");
    expect(labels).toHaveLength(7);
  });
});
