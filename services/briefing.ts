import { unstable_cache } from "next/cache";
import { fetchYield, fetchExchangeRate } from "./market-data";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";
import { translateAndSummarize } from "./translator";
import type { BriefingData, BriefingSection, ArticleSummary } from "@/types/market";

const YIELD_KEYWORD = "treasury yield";
const EXCHANGE_KEYWORD = "원달러 환율";

async function buildYieldSection(): Promise<BriefingSection> {
  const [marketResult, rawArticles] = await Promise.all([
    fetchYield(),
    fetchEnglishNews(YIELD_KEYWORD),
  ]);

  const articles: ArticleSummary[] = await Promise.all(
    rawArticles.map(async (a) => {
      const { summaryLines, content } = await translateAndSummarize(
        a.title,
        false
      );
      return { ...a, summaryLines, content };
    })
  );

  return {
    indicator: {
      symbol: "^TNX",
      label: "미국채 10년물 금리",
      unit: "%",
      data: marketResult.data,
      lastUpdated: new Date().toISOString(),
    },
    articles,
    error: marketResult.error,
  };
}

async function buildExchangeSection(): Promise<BriefingSection> {
  const [marketResult, rawArticles] = await Promise.all([
    fetchExchangeRate(),
    fetchKoreanNews(EXCHANGE_KEYWORD),
  ]);

  const articles: ArticleSummary[] = await Promise.all(
    rawArticles.map(async (a) => {
      const { summaryLines, content } = await translateAndSummarize(
        a.title,
        true
      );
      return { ...a, summaryLines, content };
    })
  );

  return {
    indicator: {
      symbol: "KRW=X",
      label: "원달러 환율",
      unit: "원",
      data: marketResult.data,
      lastUpdated: new Date().toISOString(),
    },
    articles,
    error: marketResult.error,
  };
}

export async function fetchBriefingData(): Promise<BriefingData> {
  const lastUpdatedAt = new Date().toISOString();
  const [yieldSection, exchangeRateSection] = await Promise.all([
    buildYieldSection(),
    buildExchangeSection(),
  ]);
  return { yieldSection, exchangeRateSection, lastUpdatedAt };
}

export const getBriefingData = unstable_cache(fetchBriefingData, ["briefing"], {
  revalidate: 86400,
});
