import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketFetchResult } from "@/types/market";

vi.mock("./market-data");
vi.mock("./news-fetcher");
vi.mock("./translator");

beforeEach(() => {
  vi.resetAllMocks();
});

const goodYield: MarketFetchResult = {
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

const goodExchange: MarketFetchResult = {
  data: [
    { date: "2026-04-22", value: 1380 },
    { date: "2026-04-23", value: 1375 },
    { date: "2026-04-24", value: 1382 },
    { date: "2026-04-25", value: 1378 },
    { date: "2026-04-28", value: 1385 },
    { date: "2026-04-29", value: 1383 },
    { date: "2026-04-30", value: 1388 },
  ],
};

describe("getBriefingData", () => {
  it("returns yieldSection, exchangeRateSection, and lastUpdatedAt", async () => {
    const { fetchYield, fetchExchangeRate } = await import("./market-data");
    const { fetchEnglishNews, fetchKoreanNews } = await import("./news-fetcher");
    const { translateAndSummarize } = await import("./translator");

    vi.mocked(fetchYield).mockResolvedValue(goodYield);
    vi.mocked(fetchExchangeRate).mockResolvedValue(goodExchange);
    vi.mocked(fetchEnglishNews).mockResolvedValue([]);
    vi.mocked(fetchKoreanNews).mockResolvedValue([]);
    vi.mocked(translateAndSummarize).mockResolvedValue({
      summaryLines: ["줄1", "줄2", "줄3"],
      content: "번역 내용",
    });

    const { fetchBriefingData: getBriefingData } = await import("./briefing");
    const result = await getBriefingData();

    expect(result).toHaveProperty("yieldSection");
    expect(result).toHaveProperty("exchangeRateSection");
    expect(result).toHaveProperty("lastUpdatedAt");
    expect(result.lastUpdatedAt).toBeTruthy();
  });

  it("sets yieldSection.error when yield fetch fails, exchangeRateSection remains normal", async () => {
    const { fetchYield, fetchExchangeRate } = await import("./market-data");
    const { fetchEnglishNews, fetchKoreanNews } = await import("./news-fetcher");

    vi.mocked(fetchYield).mockResolvedValue({ data: [], error: "HTTP 500" });
    vi.mocked(fetchExchangeRate).mockResolvedValue(goodExchange);
    vi.mocked(fetchEnglishNews).mockResolvedValue([]);
    vi.mocked(fetchKoreanNews).mockResolvedValue([]);

    const { fetchBriefingData: getBriefingData } = await import("./briefing");
    const result = await getBriefingData();

    expect(result.yieldSection.error).toBeDefined();
    expect(result.exchangeRateSection.error).toBeUndefined();
  });

  it("sets articles to empty array when news fetch fails", async () => {
    const { fetchYield, fetchExchangeRate } = await import("./market-data");
    const { fetchEnglishNews, fetchKoreanNews } = await import("./news-fetcher");

    vi.mocked(fetchYield).mockResolvedValue(goodYield);
    vi.mocked(fetchExchangeRate).mockResolvedValue(goodExchange);
    vi.mocked(fetchEnglishNews).mockResolvedValue([]);
    vi.mocked(fetchKoreanNews).mockResolvedValue([]);

    const { fetchBriefingData: getBriefingData } = await import("./briefing");
    const result = await getBriefingData();

    expect(result.yieldSection.articles).toEqual([]);
    expect(result.exchangeRateSection.articles).toEqual([]);
  });

  it("returns lastUpdatedAt even when yield fetch fails", async () => {
    const { fetchYield, fetchExchangeRate } = await import("./market-data");
    const { fetchEnglishNews, fetchKoreanNews } = await import("./news-fetcher");

    vi.mocked(fetchYield).mockResolvedValue({ data: [], error: "timeout" });
    vi.mocked(fetchExchangeRate).mockResolvedValue({ data: [], error: "timeout" });
    vi.mocked(fetchEnglishNews).mockResolvedValue([]);
    vi.mocked(fetchKoreanNews).mockResolvedValue([]);

    const { fetchBriefingData: getBriefingData } = await import("./briefing");
    const result = await getBriefingData();

    expect(result.lastUpdatedAt).toBeTruthy();
  });
});
