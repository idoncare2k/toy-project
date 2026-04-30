import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BriefingData } from "@/types/market";

vi.mock("@/services/briefing", () => ({
  getBriefingData: vi.fn(),
}));

const mockData: BriefingData = {
  lastUpdatedAt: "2026-04-30T07:00:00.000Z",
  yieldSection: {
    indicator: {
      symbol: "^TNX",
      label: "미국채 10년물 금리",
      unit: "%",
      lastUpdated: "2026-04-30T07:00:00.000Z",
      data: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-04-${22 + i}`,
        value: 4.4 + i * 0.01,
      })),
    },
    articles: [
      {
        source: "Bloomberg",
        publishedAt: "2026-04-30T06:00:00.000Z",
        title: "Fed holds",
        summaryLines: ["줄1", "줄2", "줄3"],
        content: "연준이 금리를 동결했습니다.",
        url: "https://bloomberg.com/1",
      },
    ],
  },
  exchangeRateSection: {
    indicator: {
      symbol: "KRW=X",
      label: "원달러 환율",
      unit: "원",
      lastUpdated: "2026-04-30T07:00:00.000Z",
      data: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-04-${22 + i}`,
        value: 1380 + i,
      })),
    },
    articles: [
      {
        source: "한국경제",
        publishedAt: "2026-04-30T06:00:00.000Z",
        title: "환율 급등",
        summaryLines: ["줄1", "줄2", "줄3"],
        content: "원달러 환율이 급등했습니다.",
        url: "https://hankyung.com/1",
      },
    ],
  },
};

describe("MacroBriefingPage", () => {
  it("displays last update time in the correct format", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue(mockData);

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText(/최종 업데이트/)).toBeTruthy();
  });

  it("renders yield section with chart and article card", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue(mockData);

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("미국채 10년물 금리")).toBeTruthy();
    expect(screen.getByText("Bloomberg")).toBeTruthy();
  });

  it("renders exchange rate section with chart and article card", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue(mockData);

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("원달러 환율")).toBeTruthy();
    expect(screen.getByText("한국경제")).toBeTruthy();
  });

  it("shows chart error when yieldSection.error is set, exchange section still renders", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue({
      ...mockData,
      yieldSection: { ...mockData.yieldSection, error: "HTTP 500" },
    });

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("chart-error")).toBeTruthy();
    expect(screen.getByText("원달러 환율")).toBeTruthy();
  });

  it("shows no-articles message when articles array is empty", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue({
      ...mockData,
      exchangeRateSection: { ...mockData.exchangeRateSection, articles: [] },
    });

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("no-articles")).toBeTruthy();
    // yield section with article still renders
    expect(screen.getByText("Bloomberg")).toBeTruthy();
  });

  it("shows 최종 업데이트 even when yieldSection has error", async () => {
    const { getBriefingData } = await import("@/services/briefing");
    vi.mocked(getBriefingData).mockResolvedValue({
      ...mockData,
      yieldSection: { ...mockData.yieldSection, error: "timeout" },
    });

    const { default: Page } = await import("../page");
    const jsx = await Page();
    render(jsx);

    // 오류 상태에서도 최종 업데이트 텍스트가 1개 이상 표시됨
    expect(screen.getAllByText(/최종 업데이트/).length).toBeGreaterThanOrEqual(1);
  });
});
