import type { MarketDataPoint, MarketFetchResult } from "@/types/market";

const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const FETCH_TIMEOUT_MS = 5_000;

function unixToDate(unix: number): string {
  return new Date(unix * 1000).toISOString().split("T")[0];
}

async function fetchMarketData(symbol: string): Promise<MarketFetchResult> {
  try {
    const url = `${YAHOO_API}/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("Invalid response");

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const points: MarketDataPoint[] = timestamps
      .map((ts, i) => ({ date: unixToDate(ts), value: closes[i] }))
      .filter((p): p is { date: string; value: number } => p.value !== null)
      .slice(-7);

    return { data: points };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "데이터를 불러올 수 없습니다",
    };
  }
}

export function fetchYield(): Promise<MarketFetchResult> {
  return fetchMarketData("^TNX");
}

export function fetchExchangeRate(): Promise<MarketFetchResult> {
  return fetchMarketData("KRW=X");
}
