import { describe, it, expect, vi } from "vitest";
import { translateAndSummarize } from "./translator";

function makeModel(responseText: string) {
  return {
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => responseText },
    }),
  };
}

describe("translateAndSummarize", () => {
  it("returns 3 summaryLines and translated content for English input", async () => {
    const model = makeModel(
      JSON.stringify({
        summaryLines: ["Fed holds rates", "Jobs data strong", "Markets react"],
        content: "연준이 고용 지표 호조 속에서 금리를 동결했습니다.",
      })
    );

    const result = await translateAndSummarize(
      "Federal Reserve holds rates steady amid inflation concerns.",
      false,
      model
    );

    expect(result.summaryLines).toHaveLength(3);
    expect(result.content).toBeTruthy();
  });

  it("returns 3 summaryLines and original Korean text for Korean input", async () => {
    const koreanText = "한국은행이 기준금리를 동결했습니다. 물가 안정을 위한 조치입니다.";
    const model = makeModel(
      JSON.stringify({
        summaryLines: ["한은 금리 동결", "물가 안정 목적", "시장 예상 부합"],
        content: "이 값은 무시됨",
      })
    );

    const result = await translateAndSummarize(koreanText, true, model);

    expect(result.summaryLines).toHaveLength(3);
    expect(result.content).toBe(koreanText);
  });
});
