import { unstable_cache } from "next/cache";
import { fetchYield, fetchExchangeRate } from "./market-data";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";
import { translateAndSummarize } from "./translator";
import type { BriefingData, BriefingSection, ArticleSummary, MarketSeries } from "@/types/market";

const YIELD_KEYWORD_EN = "treasury yield";
const EXCHANGE_KEYWORD_KO = "원달러 환율";

const EMPTY_SERIES: MarketSeries = {
  symbol: "", label: "", unit: "", data: [], lastUpdated: new Date().toISOString(),
};

const EMPTY_BRIEFING: BriefingData = {
  yieldSection: { indicator: EMPTY_SERIES, articles: [] },
  exchangeRateSection: { indicator: EMPTY_SERIES, articles: [] },
  lastUpdatedAt: new Date().toISOString(),
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 번역 호출 간 3초 간격 — Gemini 20 RPM 한도 안전하게 소비
async function processArticles(
  rawArticles: { source: string; publishedAt: string; title: string; description: string; url: string }[],
  isKorean: boolean
): Promise<ArticleSummary[]> {
  const results: ArticleSummary[] = [];
  for (let i = 0; i < rawArticles.length; i++) {
    const a = rawArticles[i];
    const { description: _desc, ...rest } = a;
    const input = a.description || a.title;
    if (i > 0) await sleep(3000); // 호출 간 3초 간격
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
  // 빌드 시점에는 빈 데이터 반환 — Gemini 호출로 인한 빌드 타임아웃 방지
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return EMPTY_BRIEFING;
  }

  const lastUpdatedAt = new Date().toISOString();
  const yieldSection = await buildYieldSection();
  await sleep(3000); // 두 섹션 사이 3초 간격
  const exchangeRateSection = await buildExchangeSection();
  return { yieldSection, exchangeRateSection, lastUpdatedAt };
}

export const getBriefingData =
  process.env.NODE_ENV === "development"
    ? fetchBriefingData
    : unstable_cache(fetchBriefingData, ["briefing", "v3"], { revalidate: 86400 });
