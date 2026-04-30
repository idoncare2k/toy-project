# macro-briefing 구현 learnings

<!-- 예상과 달랐던 것, 우회했던 것, 다시 마주치고 싶지 않은 것만 기록 -->

---
category: tooling
applied: rule
---
## Vitest ESM 환경에서 class 모킹은 vi.mock + new 조합이 불안정

**상황**: Task 3 구현 중, `vi.mock("@anthropic-ai/sdk")`로 Anthropic class를 모킹 후 `new Anthropic()` 호출 시 "is not a constructor" 오류 반복 발생.
**판단**: `vi.mock` + `vi.mocked(Class).mockImplementation(() => ...)` 방식은 Vitest ESM 환경에서 arrow function이 constructor로 사용되는 문제가 있음. 의존성 주입(optional parameter)으로 구조 변경해 해결 — `translateAndSummarize(text, isKorean, client = new Anthropic())`. 테스트는 mock 클라이언트를 직접 전달하는 방식으로 단순화.
**다시 마주칠 가능성**: 높음 — Anthropic SDK, OpenAI 등 외부 API 클라이언트를 class로 사용하는 서비스마다 동일 패턴 필요.
