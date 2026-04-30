# macro-briefing 구현 learnings

<!-- 예상과 달랐던 것, 우회했던 것, 다시 마주치고 싶지 않은 것만 기록 -->

---
category: tooling
applied: not-yet
---
## next/cache unstable_cache는 Vitest jsdom 환경에서 사용 불가

**상황**: Task 4 구현 중, `getBriefingData`(unstable_cache 래핑)를 테스트에서 직접 호출하면 "Invariant: incrementalCache missing" 오류.
**판단**: Next.js 런타임 없이는 unstable_cache가 동작하지 않음. 내부 순수 함수 `fetchBriefingData`를 별도 export해 테스트 대상으로 삼고, 캐시 래퍼는 통합 테스트에서 검증하는 방식으로 해결.
**다시 마주칠 가능성**: 높음 — `unstable_cache`, `headers()`, `cookies()` 같은 Next.js 서버 전용 API는 모두 동일한 패턴 필요.

---
category: tooling
applied: rule
---
## Vitest ESM 환경에서 class 모킹은 vi.mock + new 조합이 불안정

**상황**: Task 3 구현 중, `vi.mock("@anthropic-ai/sdk")`로 Anthropic class를 모킹 후 `new Anthropic()` 호출 시 "is not a constructor" 오류 반복 발생.
**판단**: `vi.mock` + `vi.mocked(Class).mockImplementation(() => ...)` 방식은 Vitest ESM 환경에서 arrow function이 constructor로 사용되는 문제가 있음. 의존성 주입(optional parameter)으로 구조 변경해 해결 — `translateAndSummarize(text, isKorean, client = new Anthropic())`. 테스트는 mock 클라이언트를 직접 전달하는 방식으로 단순화.
**다시 마주칠 가능성**: 높음 — Anthropic SDK, OpenAI 등 외부 API 클라이언트를 class로 사용하는 서비스마다 동일 패턴 필요.

---
category: tooling
applied: not-yet
---
## Anthropic SDK 싱글톤은 지연 초기화해야 jsdom 충돌 방지

**상황**: 코드리뷰 후 translator.ts에 모듈 레벨 싱글톤(`const defaultClient = new Anthropic()`) 추가 → jsdom에서 "browser-like environment" 오류로 테스트 전체 실패.
**판단**: 지연 초기화(`_client ??= new Anthropic()`)로 해결. 모듈 import 시가 아니라 실제 함수 호출 시 인스턴스 생성. 테스트에서는 DI로 클라이언트를 주입하므로 singleton 코드 경로 자체가 실행되지 않음.
**다시 마주칠 가능성**: 높음 — `new SomeApiClient()` 패턴을 모듈 레벨에 두면 Vitest jsdom 환경에서 항상 이 문제 재발.

---
category: code-review
applied: not-yet
---
## Promise.allSettled로 부분 실패 허용 패턴 — 섹션 독립 렌더링 불변 규칙 구현

**상황**: 코드리뷰에서 C1/I2로 지적. `Promise.all(articles.map(translate))` 패턴은 번역 1건 실패 시 섹션 전체가 크래시됨.
**판단**: `Promise.allSettled`로 교체 후 fulfilled만 필터링. spec 불변 규칙("독립적 섹션 렌더링")을 코드 수준에서 강제. 외부 API 결과를 `Promise.all`로 묶을 때 부분 실패를 어떻게 처리할지 plan 단계에서 미리 명시하면 더 좋았을 것.
**다시 마주칠 가능성**: 높음 — 외부 API 다수 호출을 묶는 패턴은 반드시 allSettled 고려.
