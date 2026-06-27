import type { Preset, Section, KeywordOptions, AiOptions } from "./types";
import { buildSections } from "./sectionBuilder";
import { applyDecorations } from "./decorator";
import { buildHtml } from "./htmlBuilder";
import { callClaude, parseClaudeResponse } from "./ai";
import { mockAnalyze } from "./mockAi";

function injectKeyword(sections: Section[], kw: string, isMain: boolean): Section[] {
  if (!kw.trim()) return sections;
  const allText = sections.flatMap((s) => s.sentences).join(" ");
  if (allText.includes(kw.trim())) return sections;
  const result = sections.map((s) => ({ ...s, sentences: [...s.sentences] }));
  if (isMain && result[0]) {
    result[0].sentences.unshift(`오늘은 ${kw.trim()}에 대해 함께 살펴보겠습니다.`);
  } else {
    const mid = result[Math.max(1, Math.floor(result.length / 2))] ?? result[result.length - 1];
    if (mid) mid.sentences.push(`${kw.trim()}도 이와 함께 알아두면 도움이 됩니다.`);
  }
  return result;
}

function applyRuleBasedFlow(
  sections: Section[],
  preset: Preset,
  keywordOptions: KeywordOptions,
): string {
  let result = sections;
  if (keywordOptions.mainKeyword.trim() || keywordOptions.subKeyword.trim()) {
    result = injectKeyword(result, keywordOptions.mainKeyword, true);
    result = injectKeyword(result, keywordOptions.subKeyword, false);
  }
  result = applyDecorations(result, preset);
  return buildHtml(result, preset);
}

export async function analyze(
  raw: string,
  preset: Preset,
  keywordOptions: KeywordOptions,
  aiOptions: AiOptions,
): Promise<string> {
  if (aiOptions.enabled) {
    // 실제 Claude API 시도
    const aiResult = await callClaude({
      rawText: raw,
      presetName: preset.name,
      keywordOptions,
      aiOptions,
    });

    if (aiResult) {
      return parseClaudeResponse(aiResult, preset);
    }

    // API 미연결 또는 응답 없음 → Mock AI 폴백
    return mockAnalyze(raw, preset, keywordOptions, aiOptions);
  }

  // AI OFF → 기존 규칙 기반
  const sections = buildSections(raw);
  return applyRuleBasedFlow(sections, preset, keywordOptions);
}
