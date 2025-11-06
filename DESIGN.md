## 메디웨이즈 디자인 가이드

본 문서는 메디웨이즈 제품 전반의 UI/UX 일관성을 위한 가이드입니다. Tailwind CSS, 다크 테마, 커스텀 컴포넌트(Admin*) 기반 설계를 기준으로 합니다.

### 1) 디자인 원칙
- 명확성: 의료 도메인 특성상 정보 구성이 가장 중요합니다. 정보 위계와 가독성을 최우선으로.
- 절제: 과도한 애니메이션/색 사용 지양. 눈에 띄어야 하는 요소에만 강조색(primary)을 사용.
- 접근성: 대비비, 포커스 링, 키보드 내비게이션을 기본 제공.
- 일관성: 동일 기능은 동일한 모양과 상호작용 패턴을 따릅니다.

### 2) 테마/색상 시스템
- 테마 방식: HTML `class="dark"` 기반 다크 테마(기본). 라이트 토큰도 제공되며 필요 시 전환 가능.
- 컬러 토큰: `src/app/globals.css`의 CSS 변수와 `tailwind.config.ts` 매핑 사용(HSL 변환).

토큰 요약(의미 기반)
- 배경/전경: `background` / `foreground`
- 카드/팝오버: `card`, `popover`
- 핵심 색상: `primary` (전경 `primary-foreground`)
- 보조/약함/강조: `secondary`, `muted`, `accent`
- 경고/삭제: `destructive`
- 테두리/입력/포커스 링: `border`, `input`, `ring`
- 반지름: `--radius` (기본 0.5rem)

사용 예시
```tsx
// 텍스트/배경
<div className="bg-background text-foreground" />

// 버튼(Primary)
<button className="bg-[#4f84f5] hover:bg-[#4574e5] text-white rounded-lg px-4 py-2" />

// Card
<div className="bg-card text-card-foreground border border-gray-800 rounded-lg" />
```

Sonner 토스트(색상 일관화)
- 성공: `.sonner-toast-success` → 파란 계열(#4f84f5)
- 오류: `.sonner-toast-error` → 레드 계열(#ef4444)

### 3) 타이포그래피
- 시스템 기본 산세리프(프로젝트 폰트 미지정 시).
- 제목 계층: h1(2xl/semibold) > h2(xl/medium) > h3(lg/medium) > body(base/normal).
- 본문 행간: `leading-relaxed` 권장.

예시
```tsx
<h1 className="text-2xl font-semibold text-white" />
<h2 className="text-lg font-medium text-white" />
<p className="text-sm text-gray-400 leading-relaxed" />
```

### 4) 간격/레이아웃/그리드
- 컨테이너: `container` 사용(중앙 정렬 + 반응형 패딩은 `tailwind.config.ts` 정의 참조).
- 반응형 기준: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536(px).
- 사이드바: `.sidebar`(배경 #0b0810), 어드민 사이드바 폭 200px, 컨텐츠 영역은 flex-1.
- 간격 가이드: 섹션 간 `mb-8`, 카드 사이 `gap-6`, 내부 패딩 `p-6` 권장.

### 5) 컴포넌트 가이드
- 버튼(Button)
  - 기본: 파란 계열 `#4f84f5` / hover `#4574e5` / disabled gray.
  - 크기: 기본 `h-10 px-4` / 아이콘 버튼은 정사각 `h-9 w-9`.
  - 상태: hover, disabled, focus-visible:ring 이용.

- 카드(Card) `AdminCard`
  - 컨테이너: `bg-[#1e2029] border border-gray-800 rounded-lg p-6`.
  - 헤더/본문을 명확히 구분, 우측에 lucide 아이콘(18~24px).

- 테이블(Table) `AdminTable`
  - 헤더: `text-xs text-gray-400 uppercase`.
  - 행: hover 시 `bg-gray-800/50`.
  - 셀: `px-6 py-4 text-sm text-gray-300 whitespace-nowrap`.

- 모달(Modal) `AdminModal`
  - 오버레이: `fixed inset-0 bg-black/50`.
  - 카드: `bg-[#1e2029] border-gray-800 rounded-lg` 최대 높이 80vh, 내부 스크롤.

- 페이지네이션 `AdminPagination`
  - 버튼 아이콘(chevrons): 20px.
  - 비활성: `disabled:opacity-50`.

- 토스트(Sonner)
  - 성공/오류 프리셋 클래스 사용, 우하단 고정.

### 6) 아이콘/이미지
- 아이콘: `lucide-react` 사용, 크기 16/18/20/24px 중 디자인 맥락에 맞춰 선택(대시보드 카드 24px, 내비게이션 18px 권장).
- 이미지: Next Image 사용 시 원격 패턴은 `next.config.js` 참고.

### 7) 접근성
- 키보드 포커스: `focus-visible:ring ring` 토큰 사용.
- 대비비: 텍스트 최소 AA 준수(어두운 배경에 `text-gray-300/400` 이상 권장).
- ARIA: 역할/라벨 지정(모달 `aria-modal`, 버튼 `aria-label`).

### 8) 모션(애니메이션)
- `tailwindcss-animate` 사용. 전환은 150~300ms, 이징은 `ease-out` 권장.
- 의미 없는 지속 애니메이션 자제, 진입/퇴장/hover 정도로 제한.

### 9) 차트/데이터 시각화
- 간단한 바 차트는 div 비율 기반으로 구현(어드민 통계 참고). 색상은 `bg-[#4f84f5]` 단색, 비율 바는 `rounded` 처리.
- 라벨은 `text-xs text-gray-400`로 제한적으로 표기.

### 10) 다크 모드
- 기본 `class="dark"` 적용. 색 토큰은 `.dark` 스코프에서 재정의.
- 라이트 모드가 필요하면 HTML class 토글 전략을 따르고, 토큰만 변경하여 전체 UI가 반영되도록 설계.

### 11) 네이밍/유틸 패턴
- 컴포넌트: UpperCamelCase, 파일/폴더는 의미 기반 분류(`components/admin/*`).
- Tailwind 유틸 순서 권장: 레이아웃 → 간격 → 배경/테두리 → 타이포그래피 → 상태.
- 조건부 클래스는 `clsx` 또는 `tailwind-merge`로 병합.

### 12) Do & Don't
Do
- 중요한 액션만 primary 색상 사용
- 컨텐츠 밀도를 일정하게 유지(gap/px 규칙 준수)
- 포커스 표시 제공

Don't
- 여러 강조색을 혼용
- 테이블에 과도한 테두리/그라데이션 적용
- 텍스트 대비가 낮은 색 사용

### 13) 예시 스니펫
```tsx
// Primary Button
export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="h-10 px-4 rounded-lg bg-[#4f84f5] hover:bg-[#4574e5] text-white disabled:bg-gray-600 focus-visible:outline-none focus-visible:ring"
      {...props}
    >
      {children}
    </button>
  );
}

// Card Section
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-6">{children}</div>;
}
```

### 14) 확장 계획
- shadcn-ui 일부 컴포넌트 도입 검토(폼/다이얼로그/셀렉트 등) → 도입 시 테마 토큰과 맞춤.
- 차트 라이브러리 연동(필요 시): 단색 + 간결한 라벨 기준 유지.


