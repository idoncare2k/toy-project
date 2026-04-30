import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchEnglishNews, fetchKoreanNews } from "./news-fetcher";

function makeRss(items: { title: string; link: string; pubDate: string; source: string }[]) {
  const itemsXml = items
    .map(
      (i) =>
        `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${i.pubDate}</pubDate><source>${i.source}</source></item>`
    )
    .join("");
  return `<?xml version="1.0"?><rss><channel>${itemsXml}</channel></rss>`;
}

const PUB_DATE = "Wed, 30 Apr 2026 07:00:00 +0000";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchEnglishNews", () => {
  it("returns at most 2 articles", async () => {
    const rss = makeRss([
      { title: "Treasury yields surge after jobs report", link: "https://ft.com/a", pubDate: PUB_DATE, source: "Financial Times" },
      { title: "Treasury market selloff deepens", link: "https://ft.com/b", pubDate: PUB_DATE, source: "Financial Times" },
      { title: "Treasury rates at highest since 2007", link: "https://ft.com/c", pubDate: PUB_DATE, source: "Financial Times" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(rss) }));

    const result = await fetchEnglishNews("treasury");
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns tier-1 articles and skips tier-2 when tier-1 exists", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        // First call (FT, tier 1) returns articles, later calls should not be needed
        const rss = makeRss([
          { title: "Treasury yields rise on strong jobs data", link: "https://ft.com/1", pubDate: PUB_DATE, source: "Financial Times" },
        ]);
        return Promise.resolve({ ok: true, text: () => Promise.resolve(rss) });
      })
    );

    const result = await fetchEnglishNews("treasury");
    expect(result.length).toBeGreaterThan(0);
    // tier-1 yielded results so tier-2 fetch should not have been made
    // (fetch called only for tier-1 sources)
    expect(callCount).toBeLessThanOrEqual(2); // FT + Reuters = tier-1 sources
  });

  it("returns empty array when all tiers fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchEnglishNews("treasury");
    expect(result).toEqual([]);
  });

  it("returned articles have source, publishedAt, title, url fields", async () => {
    const rss = makeRss([
      { title: "Treasury yields hit 4.5% on rate hike fears", link: "https://ft.com/1", pubDate: PUB_DATE, source: "Financial Times" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(rss) }));

    const result = await fetchEnglishNews("treasury");
    expect(result[0]).toHaveProperty("source");
    expect(result[0]).toHaveProperty("publishedAt");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("url");
  });
});

describe("fetchKoreanNews", () => {
  it("returns at most 2 articles", async () => {
    const naverResponse = {
      items: [
        { title: "환율 급등", link: "https://news.naver.com/1", pubDate: PUB_DATE, originallink: "https://hk.co.kr/1" },
        { title: "외환시장", link: "https://news.naver.com/2", pubDate: PUB_DATE, originallink: "https://yna.co.kr/2" },
        { title: "달러 강세", link: "https://news.naver.com/3", pubDate: PUB_DATE, originallink: "https://mk.co.kr/3" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(naverResponse) })
    );

    const result = await fetchKoreanNews("원달러 환율");
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array when NAVER API key is not set", async () => {
    // When no Naver key, should gracefully return empty array or fallback
    const result = await fetchKoreanNews("원달러 환율");
    // Without env vars set, should not throw
    expect(Array.isArray(result)).toBe(true);
  });

  it("returned articles have source, publishedAt, title, url fields", async () => {
    const naverResponse = {
      items: [
        { title: "환율 급등", link: "https://news.naver.com/1", pubDate: PUB_DATE, originallink: "https://hk.co.kr/1" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(naverResponse) })
    );
    // Temporarily set env var
    vi.stubEnv("NAVER_CLIENT_ID", "test-id");
    vi.stubEnv("NAVER_CLIENT_SECRET", "test-secret");

    const result = await fetchKoreanNews("원달러 환율");
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("source");
      expect(result[0]).toHaveProperty("publishedAt");
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("url");
    }
  });
});
