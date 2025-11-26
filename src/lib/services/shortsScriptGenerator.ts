import OpenAI from 'openai';
import { medicalLawSystemPrompt } from '@/lib/prompts/medical-law-prompt';

interface ShortSegment {
  title: string;
  content: string;
  order: number;
  videoPrompt: string;
}

interface ShortsScript {
  summary: string;
  segments: ShortSegment[];
  totalDuration: number;
}

export class ShortsScriptGeneratorService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateScript(title: string, content: string): Promise<ShortsScript> {
    const truncatedContent = content.slice(0, 8000);

    const prompt = `당신은 의료 콘텐츠를 YouTube 쇼츠로 변환하는 전문가입니다.

${medicalLawSystemPrompt}

다음은 의료 관련 블로그 글입니다. 이 글을 24초 YouTube 쇼츠 영상(8초 클립 3개)에 적합하게 구성해주세요.

제목: ${title}

본문:
${truncatedContent}

═══════════════════════════════════════════════════════════════
【2025 쇼츠 알고리즘 최적화 전략】
═══════════════════════════════════════════════════════════════

★ 핵심 지표: 시청 유지율(Retention Rate)
- 조회수보다 "얼마나 끝까지 보는가"가 중요
- 매 2-3초마다 "시각적 보상" 또는 "정보 공개"로 이탈 방지
- 50% 미만 시청률 = 훅 실패

★ 루프(Loop) 최적화
- 마지막 장면이 첫 장면과 자연스럽게 연결되면 재생 횟수 증가
- "다시 보고 싶게" 만드는 구조

═══════════════════════════════════════════════════════════════
【한국형 의료 쇼츠 콘텐츠 가이드】
═══════════════════════════════════════════════════════════════

**필수: 모든 영상은 한국 배경, 한국인 출연**
- 한국 병원/의원 인테리어 (깔끔한 흰색 톤, 현대적 디자인)
- 한국인 의사 (흰 가운, 단정한 헤어스타일)
- 한국인 환자 (20-50대 한국인 남녀)
- 한국어 간판, 한국식 대기실

요구사항:
1. 전체 요약: 3-5문장으로 핵심 내용만 간결하게 요약
2. 영상 세그먼트: 정확히 3개의 8초 클립 구성 (총 24초)

【Retention 최적화 구조】
- 0-2초: 🎯 강력한 훅 (시선 강탈)
- 2-4초: 💡 첫 번째 정보/시각적 보상
- 4-6초: 🔄 장면 전환 + 두 번째 정보
- 6-8초: ⚡ 다음 클립으로 이어지는 궁금증 유발

3. videoPrompt: 각 클립의 영상 생성용 프롬프트 (Grok Imagine 최적화)

【Grok Imagine 프롬프트 작성법】

**핵심 원칙**:
- **50-200 단어** 이내로 간결하게
- **첫 20-30 단어에 핵심 집중** (Grok은 앞부분 우선 처리)
- **빠른 전환(quick cuts)은 필수** - 바이럴 쇼츠의 핵심!
- 타임스탬프(0-2s 등) 대신 **"quick cuts between"** 형태로 표현

**필수 구조: Subject + Action + Setting + Style + Camera + Pacing**
- Pacing 키워드 필수: quick cuts, fast-paced, dynamic sequence, rapid montage

**한국형 키워드**:
- 인물: Korean woman, Korean man, Korean doctor, Korean patient
- 장소: modern Korean clinic, Korean hospital, Korean home interior
- 스타일: Korean drama aesthetic, warm soft lighting, cinematic 4K
- 감정: worried, anxious, hopeful, relieved, smiling
- 전환: quick cuts, fast-paced editing, dynamic transitions

【Grok Imagine용 프롬프트 예시 - 빠른 전환 포함】

훅(Hook) 클립:
"Fast-paced montage of worried Korean woman, quick cuts between: checking smartphone anxiously, touching forehead with concern, looking out window pensively. Modern Korean home interior, soft dramatic lighting, close-up shots, Korean drama aesthetic, cinematic 4K"

전개(Development) 클립:
"Dynamic sequence in Korean medical clinic, quick cuts between: Korean doctor in white coat greeting patient warmly, pointing at monitor explaining diagnosis, writing notes confidently. Bright professional lighting, medium shots, trustworthy atmosphere, 4K quality"

결론(Resolution) 클립:
"Uplifting montage of relief, quick cuts between: Korean patient smiling with hope, bowing to doctor gratefully, walking out of modern Korean hospital into bright sunlight. Warm hopeful mood, mixed wide and close-up shots, cinematic 4K"

【프롬프트 작성 체크리스트】
- ✅ 50-200 단어 이내 (간결하게)
- ✅ 첫 문장에 "fast-paced" 또는 "quick cuts" 필수
- ✅ "quick cuts between: A, B, C" 형태로 장면 나열
- ✅ Korean 키워드로 한국인/한국 배경 명시
- ✅ 감정 흐름 명확히 (worried → hopeful → relieved)
- ❌ 타임스탬프 사용 금지 (0-2s, 2-5s 등)
- ❌ 과도한 설명 금지 (장면당 5단어 이내)

═══════════════════════════════════════════════════════════════
【금지사항】
═══════════════════════════════════════════════════════════════

**의료법 준수**:
- 확정적 효과 표현 금지 (100%, 완치, 절대 등)
- 환자 후기/사례 금지
- 가격 언급 금지
- 과장된 표현 자제

**Grok Imagine 프롬프트 금지**:
- 타임스탬프 금지 (0-2s, 2-5s 등) → "quick cuts between" 형태로 대체
- 200단어 초과 금지
- 장면당 과도한 설명 금지 (5단어 이내로)
- 서양인/서양 배경 금지 → 반드시 Korean 키워드 포함

═══════════════════════════════════════════════════════════════
【응답 형식 (JSON)】
═══════════════════════════════════════════════════════════════

{
  "summary": "전체 요약 텍스트",
  "segments": [
    {
      "title": "훅 - 공감과 궁금증 유발",
      "content": "첫 클립 자막/나레이션 내용 (한국어, 공감가는 문제 제기)",
      "order": 0,
      "videoPrompt": "Fast-paced montage of worried Korean woman, quick cuts between: checking smartphone anxiously, touching forehead with concern, looking out window pensively. Modern Korean home, soft dramatic lighting, close-ups, Korean drama aesthetic, 4K"
    },
    {
      "title": "전개 - 전문가의 해결책",
      "content": "두 번째 클립 자막/나레이션 (핵심 정보 전달)",
      "order": 1,
      "videoPrompt": "Dynamic sequence in Korean clinic, quick cuts between: Korean doctor greeting patient warmly, pointing at monitor explaining, writing notes confidently. Bright professional lighting, medium shots, trustworthy atmosphere, 4K"
    },
    {
      "title": "결론 - 희망과 행동 유도",
      "content": "세 번째 클립 자막/나레이션 (긍정적 마무리 + CTA)",
      "order": 2,
      "videoPrompt": "Uplifting montage of relief, quick cuts between: Korean patient smiling with hope, bowing to doctor gratefully, walking out into bright sunlight. Modern Korean hospital exterior, warm hopeful mood, mixed shots, 4K"
    }
  ],
  "totalDuration": 24
}

**Grok Imagine 체크리스트**:
✅ 50-200 단어 이내 간결한 프롬프트
✅ 첫 문장에 "fast-paced" 또는 "quick cuts" 포함
✅ "quick cuts between: A, B, C" 형태로 빠른 전환 표현
✅ "Korean" 키워드로 한국인/한국 배경 명시
✅ 감정 흐름 (worried → hopeful → relieved)
✅ 장면당 5단어 이내로 간결하게
❌ 타임스탬프 사용 금지 (0-2s 등)`;

    try {
      // Responses API 사용 (GPT-5 시리즈 권장)
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano', // 요약/구조화 최적화, gpt-4o-mini보다 40% 저렴
        input: prompt,
        reasoning: {
          effort: 'minimal'  // reasoning 토큰 최소화 (빠른 응답)
        },
        text: {
          verbosity: 'low',  // 간결한 응답
          format: { type: 'json_object' }  // JSON 출력
        }
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        throw new Error('AI 응답이 비어있습니다.');
      }

      return JSON.parse(responseContent) as ShortsScript;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
      throw error;
    }
  }
}
