import Anthropic from "@anthropic-ai/sdk";

type TranslationResult = {
  summaryLines: [string, string, string];
  content: string;
};

export async function translateAndSummarize(
  text: string,
  isKorean: boolean,
  client: Pick<Anthropic, "messages"> = new Anthropic()
): Promise<TranslationResult> {
  const prompt = isKorean
    ? `다음 한국어 기사를 읽고 JSON으로 응답하세요.
- summaryLines: 핵심 내용 3줄 (각 1문장, 한국어)
- content: 원문 그대로 (번역하지 말 것)

기사:
${text}

반드시 아래 JSON 형식만 출력하세요:
{"summaryLines":["줄1","줄2","줄3"],"content":"원문"}`
    : `다음 영문 기사를 읽고 한국어로 번역 및 요약하여 JSON으로 응답하세요.
- summaryLines: 핵심 내용 3줄 (각 1문장, 한국어)
- content: 전체 번역 (한국어)

기사:
${text}

반드시 아래 JSON 형식만 출력하세요:
{"summaryLines":["줄1","줄2","줄3"],"content":"번역 전문"}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response from Claude");

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
