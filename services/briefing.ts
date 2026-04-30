import { unstable_cache } from "next/cache";
import { fetchYield, fetchExchangeRate } from "./market-data";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";
import { translateAndSummarize } from "./translator";
import type { BriefingData, BriefingSection, ArticleSummary } from "@/types/market";

const YIELD_KEYWORD_EN = "treasury yield";
const EXCHANGE_KEYWORD_KO = "원달러 환율";

// Gemini 무료 티어 분당 5회 한도 대응 — 순차 처리
async function processArticles(
  rawArticles: { source: string; publishedAt: string; title: string; description: string; url: string }[],
  isKorean: boolean
): Promise<ArticleSummary[]> {
  const results: ArticleSummary[] = [];
  for (const a of rawArticles) {
    const { description: _desc, ...rest } = a;
    const input = a.description || a.title;
    try {
      const { summaryLines, content } = await translateAndSummarize(input, isKorean);
      results.push({ ...rest, summaryLines, content });
    } catch {
      const plainDesc = input.replace(/<[^>]+>/g, "").trim();
      results.push({ ...rest, summaryLines: [a.title, "", ""], content: plainDesc || a.title });
    }
  }
  return results;
}

async function buildYieldSection(): Promise<BriefingSection> {
  const [marketResult, rawArticles] = await Promise.all([
    fetchYield(),
    fetchEnglishNews(YIELD_KEYWORD_EN),
  ]);

  const articles = await processArticles(rawArticles, false);

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

  const articles = await processArticles(rawArticles, true);

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
  // 두 섹션도 순차 처리 — 번역 API 동시 호출 최소화
  const yieldSection = await buildYieldSection();
  const exchangeRateSection = await buildExchangeSection();
  return { yieldSection, exchangeRateSection, lastUpdatedAt };
}

export const getBriefingData =
  process.env.NODE_ENV === "development"
    ? fetchBriefingData
    : unstable_cache(fetchBriefingData, ["briefing", "v2"], { revalidate: 86400 });
