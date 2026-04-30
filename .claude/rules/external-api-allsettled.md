# 외부 API 다수 호출은 Promise.allSettled로 부분 실패 허용

## 규칙

여러 외부 API 호출 결과를 묶을 때, 한 건의 실패가 전체를 실패시켜서는 안 된다면
`Promise.all` 대신 `Promise.allSettled`를 사용한다.

```ts
// ✅ 올바른 패턴 — 번역 실패 시 해당 기사만 건너뜀
const settled = await Promise.allSettled(
  rawArticles.map(async (a): Promise<ArticleSummary> => {
    const { summaryLines, content } = await translateAndSummarize(a.content);
    return { ...a, summaryLines, content };
  })
);

const articles = settled
  .filter((r): r is PromiseFulfilledResult<ArticleSummary> => r.status === "fulfilled")
  .map((r) => r.value);
```

```ts
// ❌ 잘못된 패턴 — 번역 1건 실패 시 섹션 전체 크래시
const articles = await Promise.all(
  rawArticles.map(async (a) => {
    const { summaryLines, content } = await translateAndSummarize(a.content);
    return { ...a, summaryLines, content };
  })
);
```

## Why

외부 API(Claude, RSS 피드, 뉴스 API 등)는 부분 실패가 정상이다.
`Promise.all`은 하나라도 reject되면 전체가 reject되어 spec의 "독립적 섹션 렌더링" 같은
불변 규칙을 코드 레벨에서 위반하게 된다.

## How to apply

- 독립적인 외부 API 호출 결과를 배열로 묶을 때
- 개별 실패가 전체 기능을 막아선 안 되는 경우 (ex. 기사 번역, 이미지 처리, 알림 발송 등)
- 개별 실패가 전체를 막아야 하는 경우(트랜잭션 등)에는 `Promise.all`이 올바른 선택
