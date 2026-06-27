export interface Preset {
  name: string;
  textColor: string;
  bgColor: string;
  darkBg: boolean;
  textWithUnderline: boolean;       // "text" 강조 적용 시 밑줄 동반 여부
  fontFamily: string;               // 글씨체 (기본: "inherit")
  useBold: boolean;                 // 굵게 사용 여부
  allowedDecos: DecoType[];         // 허용 강조 유형
  emphasizeFullSentence: boolean;   // true이면 구절 추출 없이 항상 문장 전체 강조 (백수진 등)
  maxPhraseHighlights?: number;     // 부분 강조(phrase) 최대 허용 횟수 (미설정 시 제한 없음)
}

export type DecoType = "text" | "bg" | "underline";

export interface DecoratedSentence {
  sentence: string;
  deco: DecoType;
  phrase?: string;    // 강조할 핵심 구절 (없으면 문장 전체)
  forceBold?: boolean; // 법령 조항 등 프리셋 설정과 무관하게 굵게 강제
}

export interface Section {
  subtitle: string | null;
  sentences: string[];
  decorated: DecoratedSentence[];
}

export interface KeywordOptions {
  mainKeyword: string;
  mainKeywordCount: number;   // 기본 7 (AI 사용 시 적용)
  subKeyword: string;
  subKeywordCount: number;    // 기본 5 (AI 사용 시 적용)
}

export interface AiOptions {
  enabled: boolean;
  model: "claude-sonnet-4-6" | "claude-opus-4-8" | "claude-haiku-4-5-20251001";
  subtitleCount: number;      // 기본 4
  emphasisMin: number;        // 기본 8
  emphasisMax: number;        // 기본 12
}

export const DEFAULT_KEYWORD_OPTIONS: KeywordOptions = {
  mainKeyword: "",
  mainKeywordCount: 7,
  subKeyword: "",
  subKeywordCount: 5,
};

export const DEFAULT_AI_OPTIONS: AiOptions = {
  enabled: false,
  model: "claude-sonnet-4-6",
  subtitleCount: 4,
  emphasisMin: 8,
  emphasisMax: 12,
};
