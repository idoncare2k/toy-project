import { XMLParser } from "fast-xml-parser";

const FETCH_TIMEOUT_MS = 5_000;

type RawArticle = {
  source: string;
  publishedAt: string;
  title: string;
  description: string;
  url: string;
};

export type { RawArticle };

const parser = new XMLParser({ ignoreAttributes: false });

function googleNewsUrl(keyword: string, lang: "en" | "ko"): string {
  const q = encodeURIComponent(keyword);
  return lang === "en"
    ? `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`
    : `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

// Google News RSS item의 source 이름 추출 (title 끝에 "- SourceName" 형태로 포함)
function extractSource(title: string, fallback: string): string {
  const match = title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : fallback;
}

// Google News는 원문 URL을 <link> 또는 <guid>로 제공
function extractUrl(item: Record<string, unknown>): string {
  return String(item.link ?? item.guid ?? "");
}

async function fetchGoogleNewsRss(keyword: string, lang: "en" | "ko"): Promise<RawArticle[]> {
  try {
    const url = googleNewsUrl(keyword, lang);
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];

    const xml = await res.text();
    const data = parser.parse(xml);
    const items: Record<string, unknown>[] = data?.rss?.channel?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];

    return arr.slice(0, 2).map((item) => {
      const rawTitle = String(item.title ?? "");
      return {
        source: extractSource(rawTitle, "Google News"),
        publishedAt: String(item.pubDate ?? new Date().toISOString()),
        title: rawTitle.replace(/ - [^-]+$/, "").trim(), // source 부분 제거
        description: String(item.description ?? ""),
        url: extractUrl(item),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchEnglishNews(keyword: string): Promise<RawArticle[]> {
  return fetchGoogleNewsRss(keyword, "en");
}

export async function fetchKoreanNews(keyword: string): Promise<RawArticle[]> {
  // Naver API 키가 있으면 우선 사용, 없으면 Google News RSS 폴백
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=10&sort=sim`;
      const res = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        const items: Record<string, string>[] = data?.items ?? [];
        if (items.length > 0) {
          return items.slice(0, 2).map((item) => ({
            source: extractKoreanSource(item.originallink ?? item.link ?? ""),
            publishedAt: item.pubDate ?? new Date().toISOString(),
            title: item.title?.replace(/<[^>]+>/g, "") ?? "",
            description: item.description?.replace(/<[^>]+>/g, "") ?? "",
            url: item.originallink ?? item.link ?? "",
          }));
        }
      }
    } catch {
      // Naver 실패 시 Google News 폴백
    }
  }

  return fetchGoogleNewsRss(keyword, "ko");
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
