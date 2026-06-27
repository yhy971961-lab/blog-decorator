import type { ClaudeResponse, ClaudeHighlight } from "./types";
import type { Section, DecoratedSentence, DecoType, Preset } from "../types";
import { buildHtml } from "../htmlBuilder";

function toDecoType(raw: string | undefined): DecoType {
  if (raw === "text" || raw === "bg" || raw === "underline") return raw;
  return "bg";
}

function buildDecorated(
  highlights: ClaudeHighlight[] = [],
  paragraphs: string[],
  preset: Preset,
): DecoratedSentence[] {
  const paraSet = new Set(paragraphs);
  return highlights
    .filter((h) => h.sentence && paraSet.has(h.sentence))
    .map((h) => {
      let deco = toDecoType(h.deco);
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

/** ClaudeResponse(JSON 오브젝트) → HTML 문자열 */
export function parseClaudeResponse(response: ClaudeResponse, preset: Preset): string {
  const sections: Section[] = [];

  // 도입부
  const introParagraphs = response.intro?.paragraphs ?? [];
  if (introParagraphs.length > 0) {
    sections.push({
      subtitle: null,
      sentences: introParagraphs,
      decorated: buildDecorated(response.intro.highlights, introParagraphs, preset),
    });
  }

  // 본문 섹션
  for (const sec of response.sections ?? []) {
    if (!sec.paragraphs?.length) continue;
    sections.push({
      subtitle: sec.heading ?? null,
      sentences: sec.paragraphs,
      decorated: buildDecorated(sec.highlights, sec.paragraphs, preset),
    });
  }

  if (sections.length === 0) return "";
  return buildHtml(sections, preset);
}
