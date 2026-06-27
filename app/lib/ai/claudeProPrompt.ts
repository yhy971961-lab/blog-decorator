import type { KeywordOptions, AiOptions } from "../types";

export function buildClaudeProPrompt(
  rawText: string,
  presetName: string,
  keywordOptions: KeywordOptions,
  aiOptions: AiOptions,
  maxPhraseHighlights?: number,
): string {
  const { mainKeyword, mainKeywordCount, subKeyword, subKeywordCount } = keywordOptions;
  const { subtitleCount, emphasisMin, emphasisMax } = aiOptions;

  const presetRules = buildPresetRules(presetName);

  const kwBlock = [
    mainKeyword.trim()
      ? `- 메인키워드 "${mainKeyword.trim()}"가 원고 전체에 ${mainKeywordCount}회 등장하도록 한다.`
      : null,
    subKeyword.trim()
      ? `- 서브키워드 "${subKeyword.trim()}"가 원고 전체에 ${subKeywordCount}회 등장하도록 한다.`
      : null,
    (mainKeyword.trim() || subKeyword.trim())
      ? `- 새 문장을 만들지 않는다. 기존 문장을 자연스럽게 수정하는 수준에서만 반영한다.`
      : `- 메인키워드·서브키워드가 없으므로 키워드 삽입은 생략한다.`,
  ]
    .filter(Boolean)
    .join('\n');

  return `당신은 15년 경력의 법률 블로그 전문 편집자입니다.

목적은 예쁘게 꾸미는 것이 아니라, 독자가 가장 먼저 봐야 할 정보를 빠르게 찾도록 편집하는 것입니다.
항상 "내가 실제 편집자라면 어디를 표시할까?"를 먼저 생각한 후 꾸밈효과를 적용하십시오.
꾸밈효과 개수를 맞추는 것이 목적이 아닙니다.
독자의 시선이 가야 할 곳에만 표시하는 것이 목적입니다.

[변호사 / 클라이언트]
${presetName}

[편집 규칙]

■ 소제목
- 원고 맨 위에는 소제목을 넣지 않는다. 첫 문장은 반드시 본문으로 시작한다.
- 소제목은 반드시 ${subtitleCount}개 생성한다.
- 소제목 앞에는 반드시 1. 2. 3. 4. 숫자 형식을 붙인다.
- 본문 전체를 먼저 읽고 ${subtitleCount}개의 흐름으로 나눈 뒤 소제목을 만든다.
- 소제목은 질문형·설명형·결론형·주의사항형 등을 자연스럽게 섞는다.
- 기존 원고에 소제목이 있어도 그대로 복사하지 않고 새롭게 작성한다.

■ 문단
- 문장 중간에서 절대 끊지 않는다.
- 기존 원고의 문단 구조를 최대한 존중한다.
- 한 문장은 반드시 하나의 문단 항목("paragraphs" 배열의 한 원소)에 완전하게 들어가야 한다.

■ 꾸밈효과(강조)
- 강조 대상 우선순위: 처벌/형량/벌금, 법 조항, 성립 요건, 증거, 진술, 수사 대응, 재판 대응, 합의, 독자가 반드시 알아야 할 내용
- 강조 금지: 단순 도입 문장, 감정적 일반 문장, 광고·소개 문장, 너무 짧은 문장
- 도입부에도 중요한 내용이 있으면 꾸밈효과를 넣는다 (최대 4~5개).
- 전체 원고 강조는 ${emphasisMin}~${emphasisMax}개 권장. 중요한 내용이 없으면 억지로 채우지 않는다.
- 문장 전체 강조와 부분 강조를 자연스럽게 섞는다.
- 부분 강조("phrase")는 단어 하나가 아닌 의미 있는 구절 단위로 한다 (최소 5자 이상).${maxPhraseHighlights !== undefined ? `\n- 부분 강조("phrase" 필드 사용)는 원고 전체에서 최대 ${maxPhraseHighlights}회로 엄격히 제한한다. 나머지는 반드시 문장 전체 강조(phrase 필드 생략)로 처리한다.` : ""}
- 따옴표("" 또는 '') 안의 문장은 따옴표까지 포함해서 "text"(글자색) 강조로 표시한다.
- 강조 유형:
  * "text" = 글자색 변경 (따옴표 문장, 핵심 결론에 사용)
  * "bg"   = 배경색 변경 (처벌 수위, 법 조항, 성립 요건에 사용)
  * "underline" = 밑줄 (대응 방법, 주의사항에 사용)
- 법령 조항(제X조, 제X조 제Y항 등)이 포함된 문장은 반드시 "bg"로 강조한다.

■ 키워드
${kwBlock}
${presetRules}
■ 절대 금지
- 없는 사실을 추가하지 않는다.
- 법률 내용의 의미를 변경하지 않는다.
- 원고를 다시 쓰지 않는다.
- 문장 순서를 크게 바꾸지 않는다.

[원고]
${rawText}

[반환 형식]
반드시 아래 JSON 형식만 반환한다.
HTML, 설명, 주석, 마크다운 없이 순수 JSON만 반환한다.

{
  "intro": {
    "paragraphs": ["문장1", "문장2"],
    "highlights": [
      {
        "sentence": "paragraphs의 항목과 정확히 동일한 문자열",
        "phrase": "강조할 구절 (생략 시 문장 전체 강조)",
        "deco": "text 또는 bg 또는 underline"
      }
    ]
  },
  "sections": [
    {
      "heading": "1. 소제목",
      "paragraphs": ["문장1", "문장2"],
      "highlights": [
        {
          "sentence": "paragraphs의 항목과 정확히 동일한 문자열",
          "phrase": "강조할 구절 (선택)",
          "deco": "text 또는 bg 또는 underline"
        }
      ]
    }
  ],
  "keywordCounts": {
    "mainKeyword": 실제_등장_횟수,
    "subKeyword": 실제_등장_횟수
  }
}

주의사항:
- highlights의 "sentence" 값은 반드시 해당 블록의 "paragraphs" 배열 항목과 글자 하나까지 완전히 동일해야 한다.
- "phrase"를 쓸 경우 해당 "sentence" 안에 실제로 포함된 문자열이어야 한다.
- keywordCounts는 수정 후 실제 등장 횟수를 기입한다. 키워드가 없으면 0.`;
}

function buildPresetRules(presetName: string): string {
  if (presetName === "법무법인 영") {
    return `
■ [법무법인 영 전용 — 일반 규칙보다 우선 적용]
- 꾸밈효과는 반드시 문장 전체에 적용한다. "phrase" 필드는 절대 사용하지 않는다.
- 소제목 섹션(sections)마다 highlights에 꾸밈효과를 최소 3개 이상 적용한다. 도입부(intro)에도 최소 3개 이상 적용한다.
- "underline" 단독 사용은 금지한다. 밑줄이 필요하면 반드시 "text"로 지정한다. ("text" 지정 시 글자색+밑줄이 자동으로 함께 적용됨)
- 사용 가능한 deco 값: "text", "bg" 두 가지만 사용한다. "underline"은 절대 사용하지 않는다.
- 꾸밈효과 적용 시 굵게(Bold)는 없다. JSON에서 별도로 표시할 필요 없음.
`;
  }
  if (presetName === "백수진(통)") {
    return `
■ [백수진(통) 전용 — 일반 규칙보다 우선 적용]
- 꾸밈효과는 반드시 문장 전체에 적용한다. "phrase" 필드는 절대 사용하지 않는다.
- 꾸밈효과가 적용된 모든 문장은 시스템이 자동으로 굵게(Bold) 처리하므로 JSON에서 별도 표시 불필요.
`;
  }
  return "";
}
