import type { Section } from "./types";

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[다요죠군네\.!?。])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

export function isSubtitleLine(line: string): boolean {
  return /^\d+\./.test(line.trim());
}

export function buildSections(rawText: string): Section[] {
  const sections: Section[] = [];
  let subtitle: string | null = null;
  let bodyLines: string[] = [];

  function flush() {
    const body = bodyLines.join("\n").trim();
    if (body.length > 0) {
      sections.push({ subtitle, sentences: splitSentences(body), decorated: [] });
    }
    subtitle = null;
    bodyLines = [];
  }

  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (isSubtitleLine(trimmed)) {
      flush();
      subtitle = trimmed;
    } else {
      bodyLines.push(trimmed);
    }
  }
  flush();

  return sections;
}
