import { Newspaper } from "lucide-react";

export function NoArticles() {
  return (
    <div
      data-testid="no-articles"
      className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed rounded-md bg-muted/30"
    >
      <Newspaper className="size-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">현재 관련 기사를 찾지 못했습니다</p>
    </div>
  );
}
