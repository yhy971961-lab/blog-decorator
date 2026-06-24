"use client";

import { useState, useRef } from "react";

interface Preset {
  name: string;
  textColor: string;
  bgColor: string;
  textWithUnderline: boolean; // 글자색 적용 시 밑줄 함께 (법무법인 영)
  darkBg: boolean;            // 배경 진할 때 글씨 흰색 (장대근 형사)
}

const PRESETS: Preset[] = [
  { name: "일송/이별전문/이혼", textColor: "#007433", bgColor: "#e3fdc8", textWithUnderline: false, darkBg: false },
  { name: "더윌가사",           textColor: "#ac9a00", bgColor: "#fff8b2", textWithUnderline: false, darkBg: false },
  { name: "법무법인 영",        textColor: "#ff0010", bgColor: "#bdfbfa", textWithUnderline: true,  darkBg: false },
  { name: "법무법인 통",        textColor: "#007aa6", bgColor: "#d5f7ff", textWithUnderline: false, darkBg: false },
  { name: "성동영",             textColor: "#007aa6", bgColor: "#dff0ff", textWithUnderline: false, darkBg: false },
  { name: "백수진(통)",         textColor: "#007aa6", bgColor: "#e0ffff", textWithUnderline: false, darkBg: false },
  { name: "박선정",             textColor: "#007aa6", bgColor: "#d5f7ff", textWithUnderline: false, darkBg: false },
  { name: "장대근(민사)",       textColor: "#00a84b", bgColor: "#e3fdc8", textWithUnderline: false, darkBg: false },
  { name: "장대근(형사)",       textColor: "#0055ff", bgColor: "#003960", textWithUnderline: false, darkBg: true  },
  { name: "김렬구",             textColor: "#007aa6", bgColor: "#e0ffff", textWithUnderline: false, darkBg: false },
];

type DecoType = "text" | "bg" | "underline";

interface DecoratedSentence { sentence: string; deco: DecoType; }
interface Section { subtitle: string | null; sentences: string[]; decorated: DecoratedSentence[]; }

/* ── 문장 분리 ── */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[다요죠군네\.!?。])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

/* ── 소제목 판단: 줄이 숫자+마침표로 시작 (1. 2. 3. …) ── */
function isSubtitleLine(line: string): boolean {
  return /^\d+\./.test(line.trim());
}

/* ── 입력 텍스트 → 섹션 구성 (줄 단위 처리) ── */
function buildSections(rawText: string): Section[] {
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

/* ── 중요도 점수 ── */
function importanceScore(s: string, i: number, total: number): number {
  return (
    s.length * 0.6 +
    (i === 0 ? 20 : 0) +
    (i === total - 1 ? 15 : 0) +
    (/\d/.test(s) ? 10 : 0) +
    (/반드시|꼭|중요|핵심|특히|가장|최고|최적|필수/.test(s) ? 12 : 0)
  );
}

/* ── 섹션마다 글자색·배경색·밑줄 각 1개 이상 선정 ── */
function applyDecorations(sections: Section[]): Section[] {
  const cycle: DecoType[] = ["text", "bg", "underline"];
  return sections.map((sec) => {
    if (sec.sentences.length === 0) return sec;
    const scored = sec.sentences
      .map((s, i) => ({ s, i, score: importanceScore(s, i, sec.sentences.length) }))
      .sort((a, b) => b.score - a.score);
    const count = Math.max(3, Math.min(5, Math.ceil(sec.sentences.length * 0.4)));
    const picked = scored.slice(0, Math.min(count, sec.sentences.length)).sort((a, b) => a.i - b.i);
    return {
      ...sec,
      decorated: picked.map((item, j) => ({ sentence: item.s, deco: cycle[j % cycle.length] })),
    };
  });
}

/* ── 키워드 삽입 ── */
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

/* ── 밑줄용 핵심 구절 추출 (문장 전체가 아니어도 됨) ── */
function extractKeyPhrase(sent: string): string {
  const clean = sent.replace(/[.!?。]$/, "").trim();

  // 서술어 직전 명사구 추출: "~입니다/합니다/됩니다" 앞 마지막 명사구
  const m = clean.match(/\s([\S]{2,10})(?:입니다|합니다|됩니다|이에요|예요|이죠|였습니다|하였습니다|되었습니다)$/);
  if (m) {
    const phrase = m[1].replace(/(을|를|은|는|이|가|의|에서|에|로|과|와|도)$/, "").trim();
    if (phrase.length >= 2) return phrase;
  }

  // 마지막 2단어 추출 (조사 제거)
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    const phrase = words.slice(-2).join(" ").replace(/(을|를|은|는|이|가|의|에서|에|로|과|와|도)$/, "").trim();
    if (phrase.length >= 2) return phrase;
  }

  return sent; // 추출 실패 시 전체 문장
}

/* ── HTML 꾸밈 적용 ── */
function decorateHtml(sent: string, deco: DecoType, preset: Preset): string {
  if (deco === "underline") {
    const phrase = extractKeyPhrase(sent);
    if (phrase === sent) {
      // 전체 문장에 밑줄
      return `<span style="font-weight:bold;text-decoration:underline;">${sent}</span>`;
    }
    // 핵심 구절에만 밑줄, 나머지는 일반 텍스트
    const idx = sent.lastIndexOf(phrase);
    if (idx < 0) return `<span style="font-weight:bold;text-decoration:underline;">${sent}</span>`;
    return (
      sent.slice(0, idx) +
      `<span style="font-weight:bold;text-decoration:underline;">${phrase}</span>` +
      sent.slice(idx + phrase.length)
    );
  }

  let style = "font-weight:bold;";
  if (deco === "text") {
    style += `color:${preset.textColor};`;
    if (preset.textWithUnderline) style += "text-decoration:underline;";
  } else {
    // bg
    style += `background-color:${preset.bgColor};`;
    if (preset.darkBg) style += "color:#ffffff;";
  }
  return `<span style="${style}">${sent}</span>`;
}

/* ── HTML 빌드 ── */
function buildHtml(sections: Section[], preset: Preset): string {
  let html = "";
  for (const sec of sections) {
    if (sec.subtitle) {
      html += `<p style="font-size:17px;font-weight:bold;margin:24px 0 10px;">${sec.subtitle}</p>\n`;
    }
    const decoMap = new Map(sec.decorated.map((d) => [d.sentence, d.deco]));
    for (const sent of sec.sentences) {
      const deco = decoMap.get(sent);
      html += deco
        ? `<p style="line-height:1.9;margin-bottom:16px;">${decorateHtml(sent, deco, preset)}</p>\n`
        : `<p style="line-height:1.9;margin-bottom:16px;">${sent}</p>\n`;
    }
    // 문단 끝 빈 줄
    html += `<p style="line-height:1.9;margin-bottom:16px;">&nbsp;</p>\n`;
  }
  return html;
}

/* ── 분석 메인 ── */
function analyze(raw: string, preset: Preset, mainKw: string, subKw: string): string {
  let sections = buildSections(raw);
  if (mainKw.trim() || subKw.trim()) {
    sections = injectKeyword(sections, mainKw, true);
    sections = injectKeyword(sections, subKw, false);
  }
  sections = applyDecorations(sections);
  return buildHtml(sections, preset);
}

/* ══════════════════════════════════════════════════
   UI
══════════════════════════════════════════════════ */
export default function BlogDecorator() {
  const [content, setContent]               = useState("");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [mainKeyword, setMainKeyword]       = useState("");
  const [subKeyword, setSubKeyword]         = useState("");
  const [resultHtml, setResultHtml]         = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const preset = PRESETS[selectedPreset];

  function handleGenerate() {
    if (!content.trim()) return;
    setResultHtml(analyze(content, preset, mainKeyword, subKeyword));
  }

  async function handleCopy() {
    if (!resultHtml) return;
    try { await navigator.clipboard.writeText(resultHtml); }
    catch { codeRef.current?.select(); document.execCommand("copy"); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
        네이버 블로그 원고 꾸밈 도구
      </h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        소제목은 35자 이하 단독 줄로 입력 · 단락은 빈 줄로 구분
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── 원고 입력 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">블로그 원고 입력</label>
          <p className="text-xs text-gray-400 mb-3">
            제목 없이 원문부터 바로 작성하세요. 소제목(35자 이하)은 자동 인식됩니다.
          </p>
          <textarea
            className="w-full h-72 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={"소제목\n\n본문 내용...\n\n소제목\n\n본문 내용..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 키워드 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">메인키워드</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 이혼 소송"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">서브키워드</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 위자료 청구"
                value={subKeyword}
                onChange={(e) => setSubKeyword(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">키워드 미입력 시 삽입 없이 진행합니다.</p>
        </div>

        {/* ── 변호사 프리셋 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">변호사 선택</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESETS.map((p, i) => {
              const isSelected = selectedPreset === i;
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedPreset(i)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className="w-full h-11 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                    style={{
                      backgroundColor: p.bgColor,
                      color: p.darkBg ? "#ffffff" : p.textColor,
                      outline: isSelected ? "3px solid #1d4ed8" : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                  >
                    가나다
                  </div>
                  <span
                    className="text-xs text-center leading-tight px-0.5"
                    style={{ color: isSelected ? "#1d4ed8" : "#6b7280", fontWeight: isSelected ? 600 : 400 }}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 선택 프리셋 미리보기 */}
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              선택: <span className="text-blue-600">{preset.name}</span>
            </p>
            <div className="flex flex-col gap-1.5 text-xs">
              <span
                className="font-bold"
                style={{
                  color: preset.textColor,
                  textDecoration: preset.textWithUnderline ? "underline" : "none",
                }}
              >
                글자색{preset.textWithUnderline ? " + 밑줄" : ""} 예시 · {preset.textColor}
              </span>
              <span
                className="font-bold px-1 py-0.5 rounded inline-block"
                style={{
                  backgroundColor: preset.bgColor,
                  color: preset.darkBg ? "#ffffff" : "#333",
                }}
              >
                배경색 예시{preset.darkBg ? " (흰글씨)" : ""} · {preset.bgColor}
              </span>
              <span className="font-bold underline text-gray-700">밑줄 예시</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              · 소제목 구간마다 글자색·배경색·밑줄 각 1개씩 자동 적용
            </p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleGenerate}
          disabled={!content.trim()}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
        >
          꾸밈 HTML 생성하기
        </button>
      </div>

      {resultHtml && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 미리보기 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">미리보기</p>
            <div
              className="text-sm leading-relaxed border border-gray-100 rounded-lg p-4 min-h-60 max-h-[600px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: resultHtml }}
            />
          </div>

          {/* HTML 코드 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">HTML 코드</p>
              <div className="flex gap-2">
                <button
                  onClick={() => codeRef.current?.select()}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  전체 선택
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {copied ? "복사됨!" : "복사하기"}
                </button>
              </div>
            </div>
            <textarea
              ref={codeRef}
              readOnly
              value={resultHtml}
              className="w-full h-[520px] border border-gray-200 rounded-lg p-3 text-xs font-mono resize-none bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 mt-2">
              * 네이버 블로그 편집기 → HTML 보기 모드에 붙여넣기 하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
