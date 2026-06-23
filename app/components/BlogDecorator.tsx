"use client";

import { useState, useRef } from "react";

const TEXT_COLORS = ["#007433", "#ac9a00", "#0055ff", "#007aa6", "#ff0010", "#007aa6"];
const BG_COLORS   = ["#e3fdc8", "#fff8b2", "#003960", "#e0ffff", "#bdfbfa", "#dff0ff"];
const DARK_BG     = "#003960"; // 이 배경색일 때 글씨는 흰색

type DecoType = "underline" | "text" | "bg";

interface DecoratedSentence {
  sentence: string;
  deco: DecoType;
}

interface Section {
  subtitle: string | null;
  number: number | null;
  sentences: string[];
  decorated: DecoratedSentence[];
}

/* ── 문장 분리 ── */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[다요죠군네\.!?。])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

/* ── 단락 파싱 (빈 줄 기준) ── */
function parseParagraphs(body: string): string[][] {
  return body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => splitSentences(block));
}

/* ── 키워드 자연 삽입 ──
   이미 있으면 skip. 없으면 최적 위치에 자연스러운 문장 추가.
   새로운 사실은 넣지 않고 흐름 연결 문장만 사용. */
function injectKeyword(
  paragraphs: string[][],
  keyword: string,
  isMain: boolean
): string[][] {
  const kw = keyword.trim();
  if (!kw) return paragraphs;

  const allText = paragraphs.flat().join(" ");
  if (allText.includes(kw)) return paragraphs; // 이미 존재

  const result = paragraphs.map((p) => [...p]);

  if (isMain) {
    // 도입부(첫 단락) 앞에 메인키워드 언급 문장 삽입
    if (result[0]) {
      result[0] = [`오늘은 ${kw}에 대해 함께 살펴보겠습니다.`, ...result[0]];
    }
  } else {
    // 중간 단락 끝에 서브키워드 언급 문장 추가
    const midIdx = Math.max(1, Math.floor(result.length / 2));
    const target = result[midIdx] ?? result[result.length - 1];
    if (target) target.push(`${kw}도 이와 함께 알아두면 도움이 됩니다.`);
  }

  return result;
}

/* ── 중요도 점수 ── */
function importanceScore(sent: string, idx: number, total: number): number {
  return (
    sent.length * 0.6 +
    (idx === 0 ? 20 : 0) +
    (idx === total - 1 ? 15 : 0) +
    (/\d/.test(sent) ? 10 : 0) +
    (/반드시|꼭|중요|핵심|특히|가장|최고|최적|필수/.test(sent) ? 12 : 0)
  );
}

function pickImportant(sentences: string[]): string[] {
  if (sentences.length === 0) return [];
  const scored = sentences
    .map((s, i) => ({ s, score: importanceScore(s, i, sentences.length) }))
    .sort((a, b) => b.score - a.score);
  const count = Math.max(3, Math.min(5, Math.ceil(sentences.length * 0.4)));
  return scored.slice(0, count).map((x) => x.s);
}

function pickDeco(idx: number): DecoType {
  const cycle: DecoType[] = ["underline", "text", "bg"];
  return cycle[idx % 3];
}

/* ── 소제목 생성 ── */
function makeSubtitle(sentences: string[], num: number): string {
  const suffixes = [" 살펴보기", " 알아보기", " 핵심 정리", " 마무리"];
  const first = sentences[0] ?? "";
  const cleaned = first.replace(
    /^(그리고|또한|하지만|그러나|따라서|그래서|즉|특히|또|이처럼|오늘은)\s*/g,
    ""
  );
  const raw = cleaned.split(/\s+/)[0]?.replace(/[.!?,。]/g, "") ?? "";
  const keyword = raw
    .replace(/(의|를|을|은|는|이|가|에서|에|로|으로|와|과|도|만)$/, "")
    .slice(0, 7) || "내용";
  return `${keyword}${suffixes[num - 1]}`;
}

/* ── 본문 → intro + 4섹션 분배 ── */
function distribute(paragraphs: string[][]): { intro: string[]; sections: string[][] } {
  const all = paragraphs.flat();
  if (all.length === 0) return { intro: [], sections: [[], [], [], []] };

  if (paragraphs.length >= 5) {
    const intro = paragraphs[0];
    const rest = paragraphs.slice(1);
    const gs = Math.ceil(rest.length / 4);
    return {
      intro,
      sections: [0, 1, 2, 3].map((i) => rest.slice(i * gs, (i + 1) * gs).flat()),
    };
  }
  if (paragraphs.length >= 2) {
    const intro = paragraphs[0];
    const rest = paragraphs.slice(1).flat();
    const cs = Math.max(1, Math.ceil(rest.length / 4));
    return {
      intro,
      sections: [0, 1, 2, 3].map((i) => rest.slice(i * cs, (i + 1) * cs)),
    };
  }
  const cut = Math.max(1, Math.ceil(all.length * 0.2));
  const rest = all.slice(cut);
  const cs = Math.max(1, Math.ceil(rest.length / 4));
  return {
    intro: all.slice(0, cut),
    sections: [0, 1, 2, 3].map((i) => rest.slice(i * cs, (i + 1) * cs)),
  };
}

/* ── HTML 꾸밈 적용 ── */
function decorateHtml(
  sent: string,
  deco: DecoType,
  textColor: string,
  bgColor: string
): string {
  let style = "font-weight:bold;";
  if (deco === "underline") {
    style += "text-decoration:underline;";
  } else if (deco === "text") {
    style += `color:${textColor};`;
  } else if (deco === "bg") {
    style += `background-color:${bgColor};`;
    if (bgColor === DARK_BG) style += "color:#ffffff;"; // 진한 배경 → 흰 글씨
  }
  return `<span style="${style}">${sent}</span>`;
}

/* ── HTML 빌드 ── */
function buildHtml(
  title: string,
  sections: Section[],
  textColor: string,
  bgColor: string
): string {
  let html = `<h2 style="font-size:22px;font-weight:bold;margin-bottom:20px;text-align:center;">${title}</h2>\n\n`;

  for (const sec of sections) {
    if (sec.subtitle && sec.number) {
      html += `<p style="font-size:17px;font-weight:bold;margin:24px 0 10px;">${sec.number}. ${sec.subtitle}</p>\n`;
    }
    const decoMap = new Map(sec.decorated.map((d) => [d.sentence, d.deco]));
    for (const sent of sec.sentences) {
      const deco = decoMap.get(sent);
      html += deco
        ? `<p style="line-height:1.9;margin-bottom:16px;">${decorateHtml(sent, deco, textColor, bgColor)}</p>\n`
        : `<p style="line-height:1.9;margin-bottom:16px;">${sent}</p>\n`;
    }
    html += "\n";
  }
  return html;
}

/* ── 분석 + HTML 생성 ── */
function analyze(
  content: string,
  textColor: string,
  bgColor: string,
  mainKeyword: string,
  subKeyword: string
): string {
  const lines = content.split("\n");
  const title = lines[0]?.trim() ?? "";
  const body = lines.slice(1).join("\n");

  let paragraphs = parseParagraphs(body);

  // 키워드 삽입 (둘 다 비어있으면 skip)
  if (mainKeyword.trim() || subKeyword.trim()) {
    paragraphs = injectKeyword(paragraphs, mainKeyword, true);
    paragraphs = injectKeyword(paragraphs, subKeyword, false);
  }

  const { intro, sections: sectionSentences } = distribute(paragraphs);

  let decoIdx = 0;
  const sections: Section[] = [];

  sections.push({
    subtitle: null,
    number: null,
    sentences: intro,
    decorated: pickImportant(intro).map((s) => ({ sentence: s, deco: pickDeco(decoIdx++) })),
  });

  sectionSentences.forEach((sents, i) => {
    sections.push({
      subtitle: makeSubtitle(sents, i + 1),
      number: i + 1,
      sentences: sents,
      decorated: pickImportant(sents).map((s) => ({ sentence: s, deco: pickDeco(decoIdx++) })),
    });
  });

  return buildHtml(title, sections, textColor, bgColor);
}

/* ══════════════════════════════
   UI 컴포넌트
══════════════════════════════ */
export default function BlogDecorator() {
  const [content, setContent]         = useState("");
  const [textColor, setTextColor]     = useState(TEXT_COLORS[0]);
  const [bgColor, setBgColor]         = useState(BG_COLORS[0]);
  const [mainKeyword, setMainKeyword] = useState("");
  const [subKeyword, setSubKeyword]   = useState("");
  const [resultHtml, setResultHtml]   = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  function handleGenerate() {
    if (!content.trim()) return;
    setResultHtml(analyze(content, textColor, bgColor, mainKeyword, subKeyword));
  }

  async function handleCopy() {
    if (!resultHtml) return;
    try {
      await navigator.clipboard.writeText(resultHtml);
    } catch {
      codeRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
        네이버 블로그 원고 꾸밈 도구
      </h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        원고를 입력하면 내용에 맞는 소제목과 꾸밈 효과가 자동 적용된 HTML을 생성합니다.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── 원고 입력 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            블로그 원고 입력
          </label>
          <p className="text-xs text-gray-400 mb-3">
            첫 줄이 제목, 단락은 빈 줄로 구분해주세요.
          </p>
          <textarea
            className="w-full h-72 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={"제목을 첫 줄에 입력하세요\n\n첫 번째 단락 (도입부)...\n\n두 번째 단락...\n\n세 번째 단락..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 키워드 입력 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">메인키워드</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 제주도 여행"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">서브키워드</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 제주 맛집"
                value={subKeyword}
                onChange={(e) => setSubKeyword(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            키워드를 입력하면 원고 흐름에 맞게 자연스럽게 삽입됩니다. 비워두면 기존 방식으로 진행합니다.
          </p>
        </div>

        {/* ── 색상 설정 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-5">

          {/* 글자색 선택 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">글자색</p>
            <div className="flex gap-2 flex-wrap">
              {TEXT_COLORS.map((c, i) => (
                <button
                  key={`tc-${i}`}
                  onClick={() => setTextColor(c)}
                  title={c}
                  className="w-9 h-9 rounded-full border-4 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: textColor === c ? "#1d4ed8" : "transparent",
                    outline: textColor === c ? "2px solid #1d4ed8" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">{textColor}</p>
          </div>

          {/* 배경색 선택 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">글자 배경색</p>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c, i) => (
                <button
                  key={`bc-${i}`}
                  onClick={() => setBgColor(c)}
                  title={c}
                  className="w-9 h-9 rounded-full border-4 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: bgColor === c ? "#1d4ed8" : "transparent",
                    outline: bgColor === c ? "2px solid #1d4ed8" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {bgColor}
              {bgColor === DARK_BG && (
                <span className="ml-2 text-yellow-600 font-medium">
                  ※ 진한 배경 → 강조 글씨 흰색 적용
                </span>
              )}
            </p>
          </div>

          {/* 현재 색상 미리보기 */}
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">색상 미리보기</p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="font-bold" style={{ textDecoration: "underline" }}>
                밑줄 예시 — 글씨체·색상 변경 없음
              </span>
              <span
                className="font-bold"
                style={{ color: textColor }}
              >
                글자색 예시 — {textColor}
              </span>
              <span
                className="font-bold"
                style={{
                  backgroundColor: bgColor,
                  color: bgColor === DARK_BG ? "#ffffff" : undefined,
                  padding: "1px 4px",
                }}
              >
                배경색 예시 — {bgColor}
              </span>
            </div>
          </div>

          {/* 규칙 안내 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-600 mb-1">꾸밈 효과 규칙</p>
            <p>· 밑줄 / 글자색 / 배경색 — 각각 단독 적용</p>
            <p>· 꾸밈 문장은 항상 굵게 처리</p>
            <p>· 도입부 소제목 없음 → 소제목 1~4번</p>
            <p>· 문장마다 한 줄씩 띄어 출력</p>
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
