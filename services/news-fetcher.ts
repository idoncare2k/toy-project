import { XMLParser } from "fast-xml-parser";
import type { ArticleSummary } from "@/types/market";

type RawArticle = Pick<ArticleSummary, "source" | "publishedAt" | "title" | "url">;

// MVP 영문 소스 티어 매핑 (Bloomberg/WSJ 공개 RSS 없음 → FT·Reuters 1티어 대체)
const ENGLISH_TIERS: { name: string; rss: string }[][] = [
  [
    { name: "Financial Times", rss: "https://www.ft.com/rss/home/us" },
    { name: "Reuters", rss: "https://feeds.reuters.com/reuters/businessNews" },
  ],
  [{ name: "CNBC", rss: "https://www.cnbc.com/id/10000664/device/rss/rss.html" }],
  [{ name: "MarketWatch", rss: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse" }],
];

const parser = new XMLParser({ ignoreAttributes: false });

async function fetchRssArticles(source: { name: string; rss: string }, keyword: string): Promise<RawArticle[]> {
  try {
    const res = await fetch(source.rss);
    if (!res.ok) return [];
    const xml = await res.text();
    const data = parser.parse(xml);
    const items: Record<string, unknown>[] = data?.rss?.channel?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];

    return arr
      .filter((item) => {
        const title = String(item.title ?? "").toLowerCase();
        const desc = String(item.description ?? "").toLowerCase();
        const kw = keyword.toLowerCase();
        return title.includes(kw) || desc.includes(kw);
      })
      .slice(0, 2)
      .map((item) => ({
        source: source.name,
        publishedAt: String(item.pubDate ?? new Date().toISOString()),
        title: String(item.title ?? ""),
        url: String(item.link ?? ""),
      }));
  } catch {
    return [];
  }
}

export async function fetchEnglishNews(keyword: string): Promise<RawArticle[]> {
  for (const tier of ENGLISH_TIERS) {
    const results = await Promise.all(tier.map((src) => fetchRssArticles(src, keyword)));
    const articles = results.flat().slice(0, 2);
    if (articles.length > 0) return articles;
  }
  return [];
}

export async function fetchKoreanNews(keyword: string): Promise<RawArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  try {
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=10&sort=sim`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const items: Record<string, string>[] = data?.items ?? [];

    return items.slice(0, 2).map((item) => ({
      source: extractKoreanSource(item.originallink ?? item.link ?? ""),
      publishedAt: item.pubDate ?? new Date().toISOString(),
      title: item.title?.replace(/<[^>]+>/g, "") ?? "",
      url: item.originallink ?? item.link ?? "",
    }));
  } catch {
    return [];
  }
}

function extractKoreanSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const domainMap: Record<string, string> = {
      "yna.co.kr": "연합뉴스",
      "hankyung.com": "한국경제",
      "mk.co.kr": "매일경제",
      "chosunbiz.com": "조선비즈",
      "fnnews.com": "파이낸셜뉴스",
      "edaily.co.kr": "이데일리",
      "asiae.co.kr": "아시아경제",
      "newspim.com": "뉴스핌",
      "heraldcorp.com": "헤럴드경제",
    };
    return domainMap[hostname] ?? hostname;
  } catch {
    return "뉴스";
  }
}
