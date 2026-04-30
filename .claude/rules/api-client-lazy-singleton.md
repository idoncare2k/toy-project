# 외부 API 클라이언트는 지연 초기화 싱글톤 + 의존성 주입

## 규칙

`new Anthropic()`, `new OpenAI()` 등 외부 API 클라이언트를 사용하는 서비스 함수는:

1. 모듈 레벨에서 즉시 인스턴스화하지 않는다
2. 지연 초기화 싱글톤(`??=`)으로 첫 호출 시 생성한다
3. 함수 파라미터로 클라이언트를 주입받을 수 있게 한다 (DI — 테스트용)

```ts
// ✅ 올바른 패턴
let _client: Anthropic | undefined;

function getDefaultClient(): Anthropic {
  return (_client ??= new Anthropic());
}

export async function translateAndSummarize(
  text: string,
  client: Pick<Anthropic, "messages"> = getDefaultClient()  // lazy, 테스트에서 주입 가능
): Promise<Result> { ... }

// 테스트에서
const mockClient = { messages: { create: vi.fn().mockResolvedValue(...) } };
await translateAndSummarize("text", mockClient);
```

```ts
// ❌ 잘못된 패턴 1 — 모듈 레벨 즉시 인스턴스화
const client = new Anthropic();  // jsdom에서 "browser-like environment" 오류
```

```ts
// ❌ 잘못된 패턴 2 — vi.mock으로 class 모킹
vi.mock("@anthropic-ai/sdk");
vi.mocked(Anthropic).mockImplementation(() => ({ ... }));
// arrow function은 constructor로 사용 불가 → TypeError
```

## Why

- Vitest jsdom은 브라우저 환경으로 감지되어 Anthropic SDK가 즉시 에러를 던진다
- `vi.mock` + `new Class()` 조합은 arrow function이 constructor로 사용될 때 TypeError 발생
- 지연 초기화 + DI는 프로덕션 성능(싱글톤)과 테스트 편의성(주입)을 동시에 달성한다

## How to apply

Anthropic, OpenAI, Stripe, 기타 외부 서비스 클라이언트를 사용하는 서비스 함수를 작성할 때마다 적용
