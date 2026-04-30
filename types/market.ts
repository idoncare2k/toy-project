export type MarketDataPoint = {
  date: string; // YYYY-MM-DD
  value: number;
};

export type MarketSeries = {
  symbol: string;
  label: string;
  unit: string;
  data: MarketDataPoint[];
  lastUpdated: string;
};

export type ArticleSummary = {
  source: string;
  publishedAt: string;
  title: string;
  summaryLines: string[];
  content: string;
  url: string;
};

export type BriefingSection = {
  indicator: MarketSeries;
  articles: ArticleSummary[];
  error?: string;
};

export type BriefingData = {
  yieldSection: BriefingSection;
  exchangeRateSection: BriefingSection;
  lastUpdatedAt: string;
};

export type MarketFetchResult = {
  data: MarketDataPoint[];
  error?: string;
};
