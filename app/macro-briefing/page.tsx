import { getBriefingData } from "@/services/briefing";
import { MarketChart } from "@/components/macro-briefing/market-chart";
import { ArticleCard } from "@/components/macro-briefing/article-card";
import { ChartError } from "@/components/macro-briefing/chart-error";
import { NoArticles } from "@/components/macro-briefing/no-articles";
import type { BriefingSection } from "@/types/market";

// 빌드 시 정적 생성 금지 — Gemini API 번역이 60초 타임아웃 초과
// 캐싱은 services/briefing.ts의 unstable_cache(revalidate=86400)가 담당
export const dynamic = "force-dynamic";

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  } catch {
    return iso;
  }
}

function IndicatorSection({ section, title }: { section: BriefingSection; title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold border-b pb-2">{title}</h2>

      {section.error ? (
        <ChartError lastUpdatedAt={section.indicator.lastUpdated} />
      ) : (
        <MarketChart series={section.indicator} />
      )}

      {section.articles.length === 0 ? (
        <NoArticles />
      ) : (
        <div className="flex flex-col gap-3">
          {section.articles.map((article) => (
            <ArticleCard key={article.url} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function MacroBriefingPage() {
  const data = await getBriefingData();

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-base font-bold">매크로 브리핑</h1>
        <p className="text-xs text-muted-foreground">
          최종 업데이트: {formatUpdatedAt(data.lastUpdatedAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IndicatorSection section={data.yieldSection} title="미국채 10년물 금리" />
        <IndicatorSection section={data.exchangeRateSection} title="원달러 환율" />
      </div>
    </main>
  );
}
