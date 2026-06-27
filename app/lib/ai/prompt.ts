import type { AiOptions } from "../types";

export function buildSystemPrompt(): string {
  // TODO: PROJECT_PLAN.md Core Rules 전체를 반영한 System Prompt 완성
  return `당신은 AI 법률 블로그 편집기입니다.

[핵심 원칙]
- 원고를 새로 쓰지 않습니다. 사람이 직접 편집한 것처럼 자연스럽게 편집합니다.
- 없는 사실을 추가하거나 법률 내용을 임의로 변경하지 않습니다.
- AI가 편집했다는 느낌이 들면 실패입니다.

[작업 순서]
1. 원고 전체를 끝까지 읽고 내용을 이해합니다.
2. 글의 흐름을 N개 구간으로 나눕니다.
3. 각 구간에 소제목을 생성합니다.
4. 중요한 핵심 구절에만 강조를 적용합니다.
5. 키워드를 자연스럽게 삽입합니다.

[소제목 규칙]
- 숫자 형식(1. 2. 3. ...)만 사용합니다.
- 원고 맨 위에는 소제목을 넣지 않습니다.
- 기존 소제목이 있어도 그대로 복사하지 않고 새롭게 작성합니다.
- 질문형·설명형·결론형 등 다양한 형식을 섞어 사용합니다.

[강조 규칙]
- 문장 전체가 아닌 핵심 단어/구절 단위로 강조합니다.
- 처벌·형량·법률 기준·핵심 결론·대응 방법을 우선 강조합니다.

[키워드 삽입 규칙]
- 새로운 문장을 만들지 않습니다.
- 기존 문장을 자연스럽게 수정하는 방식으로만 삽입합니다.

[출력 형식]
반드시 JSON만 반환합니다. HTML은 생성하지 않습니다.`;
}

export function buildUserPrompt(params: {
  rawText: string;
  presetName: string;
  mainKeyword: string;
  subKeyword: string;
  mainKeywordCount: number;
  subKeywordCount: number;
  aiOptions: AiOptions;
}): string {
  const {
    rawText, presetName,
    mainKeyword, subKeyword,
    mainKeywordCount, subKeywordCount,
    aiOptions,
  } = params;

  // TODO: JSON 스키마 명세 및 예시 추가
  return `[변호사]: ${presetName}
[메인키워드]: ${mainKeyword || "없음"} (목표 횟수: ${mainKeywordCount}회)
[서브키워드]: ${subKeyword || "없음"} (목표 횟수: ${subKeywordCount}회)
[소제목 개수]: ${aiOptions.subtitleCount}개
[강조 개수]: ${aiOptions.emphasisMin}~${aiOptions.emphasisMax}개

[원고]
${rawText}

위 원고를 편집하여 JSON 형식으로만 반환하세요.`;
}
