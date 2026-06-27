import type { Section, DecoType, DecoratedSentence, Preset } from "./types";

function importanceScore(s: string, i: number, total: number): number {
  return (
    s.length * 0.6 +
    (i === 0 ? 20 : 0) +
    (i === total - 1 ? 15 : 0) +
    (/\d/.test(s) ? 10 : 0) +
    (/반드시|꼭|중요|핵심|특히|가장|최고|최적|필수/.test(s) ? 12 : 0)
  );
}

function hasQuote(s: string): boolean {
  return /[""""]/.test(s);
}

export function applyDecorations(sections: Section[], preset: Preset): Section[] {
  const allowed = new Set(preset.allowedDecos);

  const maxCounts = [3, 2, 3, 2, 3, 2, 3, 2];
  const rawFillPatterns: DecoType[][] = [
    ["bg", "underline"],
    ["underline", "bg"],
    ["bg"],
    ["underline"],
    ["bg", "underline"],
    ["underline"],
    ["bg", "underline"],
    ["bg"],
  ];

  // 프리셋에서 허용하지 않는 유형 제거
  const fillPatterns = rawFillPatterns.map((pattern) => {
    const filtered = pattern.filter((d) => allowed.has(d));
    if (filtered.length > 0) return filtered;
    // 모두 제거된 경우 허용된 첫 번째 유형으로 대체
    return allowed.has("bg") ? ["bg" as DecoType] : ["text" as DecoType];
  });

  return sections.map((sec, idx) => {
    if (sec.sentences.length === 0) return sec;

    const maxCount = maxCounts[idx % maxCounts.length];
    const decorated: DecoratedSentence[] = [];
    const used = new Set<string>();

    // 1단계: 큰따옴표 문장 → 글자색 (허용된 경우)
    if (allowed.has("text")) {
      for (const s of sec.sentences) {
        if (decorated.length >= maxCount) break;
        if (hasQuote(s) && !used.has(s)) {
          decorated.push({ sentence: s, deco: "text" });
          used.add(s);
        }
      }
    }

    // 2단계: 남은 슬롯 → 중요도 순 bg·underline
    const remaining = maxCount - decorated.length;
    if (remaining > 0) {
      const fills = fillPatterns[idx % fillPatterns.length].slice(0, remaining);
      const scored = sec.sentences
        .map((s, i) => ({ s, i, score: importanceScore(s, i, sec.sentences.length) }))
        .filter((item) => !used.has(item.s))
        .sort((a, b) => b.score - a.score);
      fills.forEach((deco, j) => {
        if (scored[j]) {
          decorated.push({ sentence: scored[j].s, deco });
          used.add(scored[j].s);
        }
      });
    }

    // 원문 순서로 정렬
    const order = new Map(sec.sentences.map((s, i) => [s, i]));
    decorated.sort((a, b) => (order.get(a.sentence) ?? 0) - (order.get(b.sentence) ?? 0));

    return { ...sec, decorated };
  });
}
