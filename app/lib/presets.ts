import type { Preset } from "./types";

const ALL_DECOS = ["text", "bg", "underline"] as const;

export const PRESETS: Preset[] = [
  {
    name: "일송/이별전문/이혼",
    textColor: "#007433", bgColor: "#e3fdc8", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "더윌가사",
    textColor: "#ac9a00", bgColor: "#fff8b2", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "법무법인 영",
    textColor: "#ff0010", bgColor: "#bdfbfa", darkBg: false,
    textWithUnderline: true, fontFamily: "inherit",   // 글자색 강조 시 밑줄 동반
    useBold: false, emphasizeFullSentence: true,      // 굵게 없음 + 항상 문장 전체 강조
    allowedDecos: ["text", "bg"],                     // underline 단독 사용 금지
  },
  {
    name: "법무법인 통",
    textColor: "#007aa6", bgColor: "#d5f7ff", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "성동영",
    textColor: "#007aa6", bgColor: "#dff0ff", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: false, emphasizeFullSentence: false,      // 굵게 없음
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "백수진(통)",
    textColor: "#007aa6", bgColor: "#e0ffff", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: true,        // 굵게 + 문장 전체 단위 강조
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "박선정",
    textColor: "#007aa6", bgColor: "#d5f7ff", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
    maxPhraseHighlights: 2,
  },
  {
    name: "장대근(민사)",
    textColor: "#00a84b", bgColor: "#e3fdc8", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "장대근(형사)",
    textColor: "#0055ff", bgColor: "#003960", darkBg: true,  // bg 적용 시 글자색 #ffffff
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
  {
    name: "김렬구",
    textColor: "#007aa6", bgColor: "#e0ffff", darkBg: false,
    textWithUnderline: false, fontFamily: "inherit",
    useBold: true, emphasizeFullSentence: false,
    allowedDecos: [...ALL_DECOS],
  },
];
