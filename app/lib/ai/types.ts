import type { KeywordOptions, AiOptions } from "../types";

/** callClaude() 호출 파라미터 */
export interface CallClaudeParams {
  rawText: string;
  presetName: string;
  keywordOptions: KeywordOptions;
  aiOptions: AiOptions;
}

/** Claude가 반환하는 강조 정보 하나 */
export interface ClaudeHighlight {
  sentence: string;    // paragraphs 항목과 글자 하나까지 동일
  phrase?: string;     // 강조할 구절 (없으면 문장 전체)
  deco: "text" | "bg" | "underline";
}

/** Claude가 반환하는 섹션 하나 */
export interface ClaudeSection {
  heading: string;
  paragraphs: string[];
  highlights?: ClaudeHighlight[];
}

/** Claude API가 반환하는 JSON 전체 구조 */
export interface ClaudeResponse {
  intro: {
    paragraphs: string[];
    highlights?: ClaudeHighlight[];
  };
  sections: ClaudeSection[];
  keywordCounts?: {
    mainKeyword: number;
    subKeyword: number;
  };
}
