import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartError } from "./chart-error";

describe("ChartError", () => {
  it("shows 데이터를 불러올 수 없습니다", () => {
    render(<ChartError />);
    expect(screen.getByText("데이터를 불러올 수 없습니다")).toBeTruthy();
  });

  it("shows lastUpdatedAt when provided", () => {
    render(<ChartError lastUpdatedAt="2026-04-30T07:00:00.000Z" />);
    expect(screen.getByText(/최종 업데이트/)).toBeTruthy();
  });
});
