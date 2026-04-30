"use client";

export default function MacroBriefingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-muted-foreground">페이지를 불러올 수 없습니다</p>
        <button
          onClick={reset}
          className="text-xs underline text-muted-foreground hover:text-foreground"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
