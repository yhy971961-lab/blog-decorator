import type { Section, DecoratedSentence, DecoType, Preset } from "../types";
import { buildHtml } from "../htmlBuilder";

interface RawHighlight {
  sentence: string;
  phrase?: string;
  deco: string;
}

interface RawSection {
  heading: string;
  paragraphs: string[];
  highlights?: RawHighlight[];
}

interface ClaudeProResponse {
  intro: {
    paragraphs: string[];
    highlights?: RawHighlight[];
  };
  sections: RawSection[];
  keywordCounts?: {
    mainKeyword: number;
    subKeyword: number;
  };
}

// Claude가 ```json ... ``` 블록으로 감쌌을 때 추출
function extractJsonString(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) return codeBlock[1];
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return text.trim();
}

function toDecoType(raw: string): DecoType {
  if (raw === "text" || raw === "bg" || raw === "underline") return raw;
  return "bg"; // 알 수 없는 값이면 배경색으로 폴백
}

function buildDecorated(highlights: RawHighlight[] = [], paragraphs: string[], preset: Preset): DecoratedSentence[] {
  const paraSet = new Set(paragraphs);
  return highlights
    .filter((h) => h.sentence && paraSet.has(h.sentence))
    .map((h) => {
      let deco = toDecoType(h.deco ?? "bg");
      // allowedDecos에 없는 deco 타입은 "text"로 변환
      if (!preset.allowedDecos.includes(deco)) deco = "text";
      // emphasizeFullSentence가 true면 phrase 무시 (항상 문장 전체 강조)
      const phrase =
        !preset.emphasizeFullSentence &&
        h.phrase &&
        h.phrase.length >= 5 &&
        h.sentence.includes(h.phrase)
          ? h.phrase
          : undefined;
      return { sentence: h.sentence, deco, ...(phrase ? { phrase } : {}) };
    });
}

export function parseClaudeProJson(rawText: string, preset: Preset): string {
  const jsonStr = extractJsonString(rawText);

  let response: ClaudeProResponse;
  try {
    response = JSON.parse(jsonStr);
  } catch {
    throw new Error("JSON 형식이 올바르지 않습니다. Claude의 응답을 그대로 붙여넣었는지 확인하세요.");
  }

  if (!response.intro || !Array.isArray(response.sections)) {
    throw new Error('"intro"와 "sections" 필드가 필요합니다. JSON 구조를 확인하세요.');
  }

  const sections: Section[] = [];

  // 도입부
  const introParagraphs: string[] = response.intro.paragraphs ?? [];
  if (introParagraphs.length > 0) {
    sections.push({
      subtitle: null,
      sentences: introParagraphs,
      decorated: buildDecorated(response.intro.highlights, introParagraphs, preset),
    });
  }

  // 본문 섹션
  for (const sec of response.sections) {
    const paragraphs: string[] = sec.paragraphs ?? [];
    if (paragraphs.length === 0) continue;
    sections.push({
      subtitle: sec.heading ?? null,
      sentences: paragraphs,
      decorated: buildDecorated(sec.highlights, paragraphs, preset),
    });
  }

  if (sections.length === 0) {
    throw new Error("변환할 내용이 없습니다. paragraphs 배열이 비어 있는지 확인하세요.");
  }

  return buildHtml(sections, preset);
}
