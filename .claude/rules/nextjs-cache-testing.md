# Next.js 서버 캐시 API는 테스트에서 직접 호출 불가

## 규칙

`unstable_cache`, `headers()`, `cookies()` 등 Next.js 런타임 전용 API를 래핑하는 함수는
내부 순수 함수를 별도 export해 테스트 대상으로 삼는다.

```ts
// ✅ 올바른 패턴
export async function fetchBriefingData(): Promise<BriefingData> { ... }  // 테스트 대상

export const getBriefingData = unstable_cache(fetchBriefingData, ["key"], {
  revalidate: 86400,
});

// 테스트에서
import { fetchBriefingData } from "./briefing";
```

```ts
// ❌ 잘못된 패턴
export const getBriefingData = unstable_cache(async () => { ... }, ["key"]);
// → Vitest jsdom에서 "Invariant: incrementalCache missing" 오류
```

## Why

Vitest는 jsdom 환경에서 실행되며 Next.js 런타임 인프라(incrementalCache 등)가 없다.
캐시 래퍼를 직접 테스트하려 하면 런타임 에러로 테스트 전체가 실패한다.

## How to apply

- `unstable_cache`, `cache()`, `revalidatePath`, `revalidateTag`를 감싸는 함수를 작성할 때마다 적용
- 캐시 래퍼 자체의 동작(revalidate 주기 등)은 통합 테스트나 E2E에서 검증
