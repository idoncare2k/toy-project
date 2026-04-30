import { AlertCircle } from "lucide-react";

type Props = {
  lastUpdatedAt?: string;
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function ChartError({ lastUpdatedAt }: Props) {
  return (
    <div
      data-testid="chart-error"
      className="flex flex-col items-center justify-center gap-2 h-40 border border-dashed rounded-md bg-muted/30"
    >
      <AlertCircle className="size-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">데이터를 불러올 수 없습니다</p>
      {lastUpdatedAt && (
        <p className="text-xs text-muted-foreground/70">
          최종 업데이트: {formatDate(lastUpdatedAt)}
        </p>
      )}
    </div>
  );
}
