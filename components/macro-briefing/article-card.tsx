import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ArticleSummary } from "@/types/market";

type Props = {
  article: ArticleSummary;
};

function isSafeUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ArticleCard({ article }: Props) {
  return (
    <Card data-testid="article-card">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Badge variant="secondary">{article.source}</Badge>
        <span className="text-xs text-muted-foreground">{formatDate(article.publishedAt)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-semibold leading-snug">{article.title}</p>

        <Separator />

        <ul className="flex flex-col gap-1">
          {article.summaryLines.map((line, i) => (
            <li key={i} data-testid="summary-line" className="text-xs text-muted-foreground flex gap-1">
              <span className="shrink-0">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <Separator />

        <p className="text-sm leading-relaxed">{article.content}</p>

        {isSafeUrl(article.url) && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ExternalLink className="size-3" />
            원문 보기
          </a>
        )}
      </CardContent>
    </Card>
  );
}
