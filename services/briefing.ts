import { fetchYield, fetchExchangeRate } from "./market-data";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";
import { translateAndSummarize } from "./translator";
import type { BriefingData, BriefingSection, ArticleSummary } from "@/types/market";

const YIELD_KEYWORD_EN = "treasury yield";
const EXCHANGE_KEYWORD_KO = "원달러 환율";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

// 모듈 레벨 메모리 캐시 — Vercel 웜 인스턴스에서 24시간 유지
// (콜드 스타트 시 재생성, force-dynamic과 호환)
let _cache: { data: BriefingData; expiresAt: number } | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processArticles(
  rawArticles: { source: string; publishedAt: string; title: string; description: string; url: string }[],
  isKorean: boolean
): Promise<ArticleSummary[]> {
  const results: ArticleSummary[] = [];
  for (let i = 0; i < rawArticles.length; i++) {
    const a = rawArticles[i];
    const { description: _desc, ...rest } = a;
    const input = a.description || a.title;
    if (i > 0) await sleep(3000);
    try {
      const { summaryLines, content } = await translateAndSummarize(input, isKorean);
      results.push({ ...rest, summaryLines, content });
    } catch {
      const plain = input.replace(/<[^>]+>/g, "").trim();
      results.push({ ...rest, summaryLines: [a.title, "", ""], content: plain || a.title });
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

async function fetchBriefingData(): Promise<BriefingData> {
  const lastUpdatedAt = new Date().toISOString();
  const yieldSection = await buildYieldSection();
  await sleep(3000);
  const exchangeRateSection = await buildExchangeSection();
  return { yieldSection, exchangeRateSection, lastUpdatedAt };
}

export async function getBriefingData(): Promise<BriefingData> {
  if (_cache && Date.now() < _cache.expiresAt) {
    return _cache.data;
  }
  const data = await fetchBriefingData();
  _cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

// 테스트용 export
export { fetchBriefingData };
