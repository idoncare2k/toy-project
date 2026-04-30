import { unstable_cache } from "next/cache";
import { fetchYield, fetchExchangeRate } from "./market-data";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";
import { translateAndSummarize } from "./translator";
import type { BriefingData, BriefingSection, ArticleSummary } from "@/types/market";

// 영문 키워드(영문 RSS), 한글 키워드(Naver API)
const YIELD_KEYWORD_EN = "treasury yield";
const EXCHANGE_KEYWORD_KO = "원달러 환율";

async function buildYieldSection(): Promise<BriefingSection> {
  const [marketResult, rawArticles] = await Promise.all([
    fetchYield(),
    fetchEnglishNews(YIELD_KEYWORD_EN),
  ]);

  const settled = await Promise.allSettled(
    rawArticles.map(async (a): Promise<ArticleSummary> => {
      const input = a.description || a.title;
      const { description: _desc, ...rest } = a;
      try {
        const { summaryLines, content } = await translateAndSummarize(input, false);
        return { ...rest, summaryLines, content };
      } catch {
        // Claude API 실패 시 원문 그대로 표시
        const plainDesc = input.replace(/<[^>]+>/g, "").trim();
        return { ...rest, summaryLines: [a.title, "", ""], content: plainDesc || a.title };
      }
    })
  );

  const articles: ArticleSummary[] = settled
    .filter((r): r is PromiseFulfilledResult<ArticleSummary> => r.status === "fulfilled")
    .map((r) => r.value);

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
    fetchKoreanNews(EXCHANGE_KEYWORD_KO),
  ]);

  const settled = await Promise.allSettled(
    rawArticles.map(async (a): Promise<ArticleSummary> => {
      const input = a.description || a.title;
      const { description: _desc, ...rest } = a;
      try {
        const { summaryLines, content } = await translateAndSummarize(input, true);
        return { ...rest, summaryLines, content };
      } catch {
        // Claude API 실패 시 원문 그대로 표시
        const plainDesc = input.replace(/<[^>]+>/g, "").trim();
        return { ...rest, summaryLines: [a.title, "", ""], content: plainDesc || a.title };
      }
    })
  );

  const articles: ArticleSummary[] = settled
    .filter((r): r is PromiseFulfilledResult<ArticleSummary> => r.status === "fulfilled")
    .map((r) => r.value);

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

export const getBriefingData =
  process.env.NODE_ENV === "development"
    ? fetchBriefingData
    : unstable_cache(fetchBriefingData, ["briefing"], { revalidate: 86400 });
