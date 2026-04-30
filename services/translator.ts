import { GoogleGenerativeAI } from "@google/generative-ai";

type TranslationResult = {
  summaryLines: [string, string, string];
  content: string;
};

type GeminiModel = {
  generateContent: (prompt: string) => Promise<{ response: { text: () => string } }>;
};

let _genAI: GoogleGenerativeAI | undefined;
function getDefaultModel(): GeminiModel {
  _genAI ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  return _genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(
  model: GeminiModel,
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const is429 = msg.includes("429") || msg.includes("Too Many Requests");
      const retryMatch = msg.match(/retryDelay[^\d]*(\d+)/);
      const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 : 15_000;

      if (is429 && attempt < maxRetries - 1) {
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function translateAndSummarize(
  text: string,
  isKorean: boolean,
  model: GeminiModel = getDefaultModel()
): Promise<TranslationResult> {
  const prompt = isKorean
    ? `다음 한국어 기사를 읽고 JSON으로만 응답하세요. 다른 텍스트는 출력하지 마세요.
- summaryLines: 핵심 내용 3줄 (각 1문장, 한국어)
- content: 원문 그대로 (번역하지 말 것)

기사:
${text}

{"summaryLines":["줄1","줄2","줄3"],"content":"원문"}`
    : `다음 영문 기사를 한국어로 번역 및 요약하고 JSON으로만 응답하세요. 다른 텍스트는 출력하지 마세요.
- summaryLines: 핵심 내용 3줄 (각 1문장, 한국어)
- content: 전체 한국어 번역

기사:
${text}

{"summaryLines":["줄1","줄2","줄3"],"content":"번역 전문"}`;

  const raw = await generateWithRetry(model, prompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response from Gemini");

  const parsed = JSON.parse(jsonMatch[0]) as {
    summaryLines: string[];
    content: string;
  };

  const lines = parsed.summaryLines.slice(0, 3);
  while (lines.length < 3) lines.push("");

  return {
    summaryLines: lines as [string, string, string],
    content: isKorean ? text : parsed.content,
  };
}
