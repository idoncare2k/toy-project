# 매크로 브리핑 대시보드 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 라우트 | `app/macro-briefing/page.tsx` | 기존 홈페이지 보존, 독립 경로로 공유 링크 명확 |
| 금융 데이터 소스 | Yahoo Finance 비공식 API | 무료·API key 불필요. 미국채(^TNX)·환율(KRW=X) 동시 지원 |
| 영문 뉴스 소스 | FT·Reuters 공개 RSS | Bloomberg·WSJ은 공개 RSS 미제공 → FT·Reuters 대체. 추후 NewsAPI 도입 검토 |
| 한글 뉴스 소스 | 네이버 뉴스 검색 API (key 필요) 또는 개별 RSS 폴백 | 공감수 정렬 가능, 한국 주요 언론사 통합 검색 |
| 번역·요약 | Anthropic SDK (claude-sonnet-4-6) | 맥락 보존 번역, 3줄 요약 품질 |
| 갱신 전략 | Next.js ISR (`revalidate = 86400`) + `unstable_cache` | 별도 cron 인프라 불필요. Claude API 호출 비용 중복 방지 |
| 차트 | shadcn Chart (Recharts 래핑) | 프로젝트 shadcn 스택과 일치 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| ANTHROPIC_API_KEY | Env var | `.env.local` | Task 3 |
| NAVER_CLIENT_ID / NAVER_CLIENT_SECRET | Env var | `.env.local` | Task 2 |

## 데이터 모델

### MarketDataPoint
- date: string (YYYY-MM-DD, required)
- value: number (required)

### MarketSeries
- symbol: string (예: "^TNX", "KRW=X")
- label: string (예: "미국채 10년물 금리")
- unit: string (예: "%", "원")
- data: MarketDataPoint[] (7개, 영업일 기준)
- lastUpdated: string (ISO datetime)

### ArticleSummary
- source: string (예: "Bloomberg", "한국경제")
- publishedAt: string (ISO datetime)
- title: string
- summaryLines: string[] (3개)
- content: string (번역 전문 또는 한글 원문)
- url: string

### BriefingSection
- indicator: MarketSeries
- articles: ArticleSummary[] (0–2개)
- error?: string (수집 실패 시)

### BriefingData
- yieldSection: BriefingSection
- exchangeRateSection: BriefingSection
- lastUpdatedAt: string (ISO datetime)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | Task 4, 7 | RSC, unstable_cache, Promise.all 병렬 패턴 |
| shadcn | Task 5, 6, 7, 8 | Chart, Card, Badge, Alert 컴포넌트 |
| claude-api | Task 3 | Anthropic SDK 번역·요약 구현 |
| vercel-react-best-practices | Task 5, 6 | 렌더링 패턴, async 경계 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/market.ts` | New | Task 1 |
| `services/market-data.ts` | New | Task 1 |
| `services/market-data.test.ts` | New | Task 1 |
| `services/news-fetcher.ts` | New | Task 2 |
| `services/news-fetcher.test.ts` | New | Task 2 |
| `services/translator.ts` | New | Task 3 |
| `services/translator.test.ts` | New | Task 3 |
| `.env.local` | Modify | Task 3 |
| `services/briefing.ts` | New | Task 4 |
| `services/briefing.test.ts` | New | Task 4 |
| `components/macro-briefing/market-chart.tsx` | New | Task 5 |
| `components/macro-briefing/market-chart.test.tsx` | New | Task 5 |
| `components/macro-briefing/article-card.tsx` | New | Task 6 |
| `components/macro-briefing/article-card.test.tsx` | New | Task 6 |
| `app/macro-briefing/page.tsx` | New | Task 7 |
| `app/macro-briefing/__tests__/page.test.tsx` | New | Task 7 |
| `components/macro-briefing/chart-error.tsx` | New | Task 8 |
| `components/macro-briefing/no-articles.tsx` | New | Task 8 |
| `app/macro-briefing/error.tsx` | New | Task 8 |

## Tasks

### Task 1: Yahoo Finance API로 금융 데이터 수집 [HIGH RISK]

- **담당 시나리오**: Scenario 1 (차트 7개 데이터 포인트), Scenario 2 (동일)
- **크기**: S (3 파일)
- **의존성**: None
- **참조**:
  - Yahoo Finance 비공식 API: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=10d`
  - 심볼: `^TNX` (미국채 10년물), `KRW=X` (원달러 환율)
- **구현 대상**:
  - `types/market.ts` — MarketDataPoint, MarketSeries, ArticleSummary, BriefingSection, BriefingData
  - `services/market-data.ts` — fetchYield(), fetchExchangeRate(), 7영업일 슬라이싱
  - `services/market-data.test.ts` — fetch mock, 정상·실패 케이스
- **수용 기준**:
  - [ ] fetchYield()가 날짜·값 쌍 7개 배열을 반환한다
  - [ ] fetchExchangeRate()가 날짜·값 쌍 7개 배열을 반환한다
  - [ ] API 호출 실패 시 error 문자열을 담은 객체를 반환한다 (예외를 던지지 않는다)
- **검증**: `bun run test -- market-data`

---

### Task 2: 뉴스 RSS 수집 + 언론사 티어 필터링 [HIGH RISK]

- **담당 시나리오**: Scenario 1 (언론사명·발행 시각 표시), Scenario 2 (동일)
- **크기**: S (2 파일)
- **의존성**: Task 1 (ArticleSummary 타입)
- **참조**:
  - FT RSS: `https://www.ft.com/rss/home/us`
  - Reuters RSS: `https://feeds.reuters.com/reuters/businessNews`
  - 네이버 뉴스 검색 API: `https://openapi.naver.com/v1/search/news.json` (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 필요)
  - 언론사 티어 정의: `artifacts/macro-briefing/spec.md` — 언론사 티어 섹션
- **구현 대상**:
  - `services/news-fetcher.ts` — fetchEnglishNews(keyword), fetchKoreanNews(keyword), 티어 순 정렬·최대 2건 반환. MVP 영문 소스 티어 매핑: FT·Reuters를 1티어 대체로 사용 (Bloomberg·WSJ 공개 RSS 미제공)
  - `services/news-fetcher.test.ts` — mock RSS/API 응답, 티어 필터링·빈 배열 케이스
- **수용 기준**:
  - [ ] 1티어 기사가 있으면 2·3티어 기사를 반환하지 않는다
  - [ ] 결과 기사는 최대 2건이다
  - [ ] 반환 기사에 source, publishedAt, title, url 필드가 존재한다 (summaryLines·content는 Task 3에서 추가)
  - [ ] 모든 티어에서 기사를 찾지 못하면 빈 배열을 반환한다
- **검증**: `bun run test -- news-fetcher`

---

### Task 3: Claude API 번역·요약 서비스

- **담당 시나리오**: Scenario 1 (한국어 3줄 요약·번역 전문), Scenario 2 (한국어 3줄 요약·원문 표시)
- **크기**: S (2 파일)
- **의존성**: None
- **참조**:
  - claude-api 스킬 — Anthropic SDK, prompt caching, 모델 ID
  - 모델: `claude-sonnet-4-6`
  - `.env.local`에 `ANTHROPIC_API_KEY` 추가
- **구현 대상**:
  - `services/translator.ts` — translateAndSummarize(text, isKorean): { summaryLines: string[3], content: string }
  - `services/translator.test.ts` — Anthropic 클라이언트 mock, 응답 파싱 검증
- **수용 기준**:
  - [ ] 영문 입력 시 summaryLines 3개 + 한국어 번역 content를 반환한다
  - [ ] 한글 입력 시 summaryLines 3개 + 원문 그대로의 content를 반환한다
- **검증**: `bun run test -- translator`

---

### Checkpoint: Tasks 1–3 이후

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 서비스 3개(market-data, news-fetcher, translator)가 독립적으로 mock 없이 실제 API 호출 동작 확인

---

### Task 4: 브리핑 데이터 조합 + ISR 캐싱

- **담당 시나리오**: Scenario 4 (갱신 시각 표시), 불변 규칙 (독립적 섹션 렌더링)
- **크기**: S (2 파일)
- **의존성**: Task 1, 2, 3
- **참조**:
  - next-best-practices 스킬 — data-patterns.md (Promise.all 병렬 패턴), unstable_cache
- **구현 대상**:
  - `services/briefing.ts` — getBriefingData(): Promise\<BriefingData\>, unstable_cache 래핑, Promise.all로 금리·환율 병렬 수집, lastUpdatedAt 기록
  - `services/briefing.test.ts` — market-data·news-fetcher·translator mock, 조합 결과 및 독립 오류 처리 검증
- **수용 기준**:
  - [ ] getBriefingData()가 yieldSection, exchangeRateSection, lastUpdatedAt을 반환한다
  - [ ] 금리 수집 실패 시 yieldSection.error가 존재하고 exchangeRateSection은 정상이다
  - [ ] 기사 수집 실패 시 해당 섹션의 articles가 빈 배열이다
  - [ ] 금리 또는 환율 수집 실패 시에도 lastUpdatedAt이 채워진 BriefingData를 반환한다
- **검증**: `bun run test -- briefing`

---

### Task 5: 선 차트 컴포넌트

- **담당 시나리오**: Scenario 1 (차트 7개 데이터 포인트), Scenario 2 (동일)
- **크기**: S (2 파일)
- **의존성**: Task 1 (MarketSeries 타입)
- **참조**:
  - shadcn 스킬 — Chart 컴포넌트 (`bunx --bun shadcn@latest add chart`)
- **구현 대상**:
  - `components/macro-briefing/market-chart.tsx` — MarketSeries props 수신, shadcn LineChart 래핑, x축 날짜 레이블
  - `components/macro-briefing/market-chart.test.tsx` — 7개 데이터 포인트 렌더 검증
- **수용 기준**:
  - [ ] data 7개 입력 시 차트 DOM 내에 데이터 포인트 요소(dot 또는 circle)가 7개 존재한다
  - [ ] x축에 날짜 레이블 7개가 표시된다
- **검증**: `bun run test -- market-chart`

---

### Task 6: 기사 카드 컴포넌트

- **담당 시나리오**: Scenario 1 (기사 카드 전체), Scenario 2 (동일), Scenario 3 (원문 링크 새 탭)
- **크기**: S (2 파일)
- **의존성**: Task 1 (ArticleSummary 타입)
- **참조**:
  - shadcn 스킬 — Card (`CardHeader`, `CardContent`), Badge 컴포넌트
- **구현 대상**:
  - `components/macro-briefing/article-card.tsx` — source(Badge), 발행 시각, summaryLines 3줄 목록, content 전문, "원문 보기" 링크(target="_blank" rel="noopener noreferrer")
  - `components/macro-briefing/article-card.test.tsx`
- **수용 기준**:
  - [ ] 언론사명 텍스트가 표시된다 (예: "Bloomberg")
  - [ ] 발행 시각 텍스트가 표시된다
  - [ ] summaryLines 3개가 목록 항목으로 표시된다
  - [ ] content 텍스트가 표시된다
  - [ ] "원문 보기" 링크에 `target="_blank"` 속성이 있다
- **검증**: `bun run test -- article-card`

---

### Checkpoint: Tasks 4–6 이후

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] mock 데이터로 차트·카드 컴포넌트 UI가 브라우저에서 정상 렌더됨 (Human review — 브라우저 직접 확인)

---

### Task 7: 대시보드 페이지 — 정상 상태

- **담당 시나리오**: Scenario 1, 2, 3, 4 (full)
- **크기**: M (3 파일)
- **의존성**: Task 4, 5, 6
- **참조**:
  - next-best-practices 스킬 — rsc-boundaries.md, async-patterns.md
  - `artifacts/macro-briefing/wireframe.html` — 2컬럼 데스크톱 / 단일 컬럼 모바일 레이아웃, 헤더 갱신 시각 위치
- **구현 대상**:
  - `app/macro-briefing/page.tsx` — async Server Component, `export const revalidate = 86400`, getBriefingData() 호출, 헤더(갱신 시각), 2컬럼 그리드(Tailwind `md:grid-cols-2`)
  - `app/macro-briefing/__tests__/page.test.tsx` — getBriefingData mock, 갱신 시각·섹션 렌더 검증
- **수용 기준**:
  - [ ] 페이지에 "최종 업데이트: YYYY-MM-DD HH:MM" 형식 텍스트가 표시된다
  - [ ] 금리 섹션에 차트 컴포넌트와 기사 카드 컴포넌트가 렌더된다
  - [ ] 환율 섹션에 차트 컴포넌트와 기사 카드 컴포넌트가 렌더된다
- **검증**:
  - `bun run test -- page`
  - `bun run build`

---

### Task 8: 오류 상태 처리

- **담당 시나리오**: Scenario 5 (차트 오류), Scenario 6 (기사 없음), 불변 규칙 (독립 렌더링·갱신 시각 항상 표시)
- **크기**: M (4 파일 + page.tsx 수정)
- **의존성**: Task 7
- **참조**:
  - shadcn 스킬 — Alert 컴포넌트 (오류 표시)
  - next-best-practices 스킬 — error-handling.md
- **구현 대상**:
  - `components/macro-briefing/chart-error.tsx` — "데이터를 불러올 수 없습니다" + 갱신 시각
  - `components/macro-briefing/no-articles.tsx` — "현재 관련 기사를 찾지 못했습니다"
  - `app/macro-briefing/error.tsx` — Next.js error boundary ("use client")
  - `app/macro-briefing/page.tsx` 수정 — section.error 조건부 렌더링 추가
- **수용 기준**:
  - [ ] yieldSection.error가 있으면 금리 차트 자리에 "데이터를 불러올 수 없습니다" 텍스트가 표시된다
  - [ ] yieldSection.error가 있어도 환율 섹션은 정상 렌더된다
  - [ ] articles가 빈 배열이면 기사 카드 자리에 "현재 관련 기사를 찾지 못했습니다" 텍스트가 표시된다
  - [ ] 오류 상태에서도 "최종 업데이트" 텍스트가 표시된다
- **검증**:
  - `bun run test -- chart-error no-articles`
  - `bun run test -- page` (오류 mock 포함)
  - `bun run build`

---

### Checkpoint: Tasks 7–8 이후

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] `/macro-briefing` 페이지가 실제 API로 end-to-end 동작 (Human review)
- [ ] yieldSection.error mock 상태에서 두 섹션 독립 렌더 확인 (Human review)

---

## 미결정 항목

- 네이버 뉴스 API 키 미획득 시 → 한국 언론사 개별 RSS로 대체 (한국경제·연합뉴스 RSS 제공)
- Bloomberg·WSJ 공개 RSS 없음 → FT·Reuters로 MVP 구현, 추후 NewsAPI 통합 검토
