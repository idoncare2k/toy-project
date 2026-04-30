import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleCard } from "./article-card";
import type { ArticleSummary } from "@/types/market";

const article: ArticleSummary = {
  source: "Bloomberg",
  publishedAt: "2026-04-30T07:00:00.000Z",
  title: "Fed holds rates steady",
  summaryLines: ["연준이 금리를 동결했습니다", "고용 지표가 호조를 보였습니다", "시장은 하락으로 반응했습니다"],
  content: "연방준비제도(Fed)는 1월 고용 지표가 예상을 크게 상회하자 금리를 동결했습니다.",
  url: "https://bloomberg.com/article/1",
};

describe("ArticleCard", () => {
  it("displays the source name", () => {
    render(<ArticleCard article={article} />);
    expect(screen.getByText("Bloomberg")).toBeTruthy();
  });

  it("displays the published time", () => {
    render(<ArticleCard article={article} />);
    // publishedAt should be shown in some form
    const card = screen.getByTestId("article-card");
    expect(card.textContent).toMatch(/2026|시간|전|Apr/);
  });

  it("displays all 3 summary lines as list items", () => {
    render(<ArticleCard article={article} />);
    const items = screen.getAllByTestId("summary-line");
    expect(items).toHaveLength(3);
  });

  it("displays the article content", () => {
    render(<ArticleCard article={article} />);
    expect(screen.getByText(article.content)).toBeTruthy();
  });

  it("renders the source link with target=_blank", () => {
    render(<ArticleCard article={article} />);
    const link = screen.getByRole("link", { name: /원문 보기/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("href")).toBe(article.url);
  });
});
