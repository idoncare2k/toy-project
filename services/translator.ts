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

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
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
