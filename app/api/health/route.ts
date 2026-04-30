import { fetchEnglishNews } from "@/services/news-fetcher";
import { translateAndSummarize } from "@/services/translator";
import { NextResponse } from "next/server";

export async function GET() {
  const env = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NAVER_CLIENT_ID: !!process.env.NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET: !!process.env.NAVER_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  let newsOk = false;
  let translateOk = false;
  let translateError = "";

  try {
    const articles = await fetchEnglishNews("treasury yield");
    newsOk = articles.length > 0;

    if (newsOk) {
      await translateAndSummarize(articles[0].title, false);
      translateOk = true;
    }
  } catch (e) {
    translateError = e instanceof Error ? e.message.slice(0, 200) : String(e);
  }

  return NextResponse.json({ env, newsOk, translateOk, translateError });
}
