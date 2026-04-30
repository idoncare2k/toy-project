import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoArticles } from "./no-articles";

describe("NoArticles", () => {
  it("shows 현재 관련 기사를 찾지 못했습니다", () => {
    render(<NoArticles />);
    expect(screen.getByText("현재 관련 기사를 찾지 못했습니다")).toBeTruthy();
  });
});
