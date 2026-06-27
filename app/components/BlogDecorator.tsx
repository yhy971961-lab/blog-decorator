"use client";

import { useState, useRef } from "react";
import { PRESETS } from "../lib/presets";
import { analyze } from "../lib/analyzer";
import {
  DEFAULT_KEYWORD_OPTIONS,
  DEFAULT_AI_OPTIONS,
  type KeywordOptions,
  type AiOptions,
} from "../lib/types";
import { buildClaudeProPrompt } from "../lib/ai/claudeProPrompt";
import { parseClaudeProJson } from "../lib/ai/claudeProParser";
import { parseClaudeResponse } from "../lib/ai/parser";

type EditMode = "claude" | "manual" | "mock";

export default function BlogDecorator() {
  // ── 공통 상태
  const [content, setContent]               = useState("");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [keywordOptions, setKeywordOptions] = useState<KeywordOptions>(DEFAULT_KEYWORD_OPTIONS);
  const [resultHtml, setResultHtml]         = useState<string | null>(null);
  const [pendingHtml, setPendingHtml]       = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);
  const [isGenerating, setIsGenerating]     = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const preset = PRESETS[selectedPreset];

  // ── 편집 모드
  const [editMode, setEditMode] = useState<EditMode>("claude");

  // ── AI 옵션 (Mock + Claude 자동 공용)
  const [aiOptions, setAiOptions] = useState<AiOptions>(DEFAULT_AI_OPTIONS);

  // ── Claude 자동 편집 상태
  const [claudeError, setClaudeError] = useState<string | null>(null);

  // ── Claude Pro 수동 모드 상태
  const [claudePrompt, setClaudePrompt] = useState<string | null>(null);
  const [jsonInput, setJsonInput]       = useState("");
  const [jsonError, setJsonError]       = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // ── 헬퍼
  function setKw(field: keyof KeywordOptions, value: string | number) {
    setKeywordOptions((prev) => ({ ...prev, [field]: value }));
  }
  function setAi(field: keyof AiOptions, value: boolean | string | number) {
    setAiOptions((prev) => ({ ...prev, [field]: value }));
  }

  // ══════════════════════════════════════════════════
  // Claude 자동 편집
  // ══════════════════════════════════════════════════
  async function handleClaudeAutoEdit() {
    if (!content.trim() || isGenerating) return;
    setIsGenerating(true);
    setPendingHtml(null);
    setClaudeError(null);
    try {
      const res = await fetch("/api/edit-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: content,
          presetName: preset.name,
          keywordOptions,
          aiOptions,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        setClaudeError(result.error ?? "Claude API 오류가 발생했습니다.");
        return;
      }
      // ClaudeResponse 오브젝트 → HTML
      const html = parseClaudeResponse(result.data, preset);
      if (!html) { setClaudeError("편집 결과가 비어 있습니다."); return; }
      setPendingHtml(html);
    } catch (e) {
      setClaudeError(e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ══════════════════════════════════════════════════
  // Mock 자동 편집
  // ══════════════════════════════════════════════════
  async function handleMockGenerate() {
    if (!content.trim() || isGenerating) return;
    setIsGenerating(true);
    setPendingHtml(null);
    try {
      const mockOpts = { ...aiOptions, enabled: true }; // mock은 항상 enabled
      const html = await analyze(content, preset, keywordOptions, mockOpts);
      setPendingHtml(html);
    } finally {
      setIsGenerating(false);
    }
  }

  // ══════════════════════════════════════════════════
  // AI 미리보기 적용/취소
  // ══════════════════════════════════════════════════
  function handleApplyPending() { if (pendingHtml) { setResultHtml(pendingHtml); setPendingHtml(null); } }
  function handleDiscardPending() { setPendingHtml(null); }

  // ══════════════════════════════════════════════════
  // Claude Pro 수동 모드
  // ══════════════════════════════════════════════════
  function handleGeneratePrompt() {
    if (!content.trim()) return;
    setClaudePrompt(buildClaudeProPrompt(content, preset.name, keywordOptions, aiOptions, preset.maxPhraseHighlights));
  }

  async function handleCopyPrompt() {
    if (!claudePrompt) return;
    try { await navigator.clipboard.writeText(claudePrompt); }
    catch { promptRef.current?.select(); document.execCommand("copy"); }
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  function handleApplyJson() {
    setJsonError(null);
    if (!jsonInput.trim()) return;
    try {
      const html = parseClaudeProJson(jsonInput, preset);
      setResultHtml(html);
      setPendingHtml(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "JSON 파싱 오류");
    }
  }

  // ══════════════════════════════════════════════════
  // HTML 복사
  // ══════════════════════════════════════════════════
  async function handleCopy() {
    if (!resultHtml) return;
    try { await navigator.clipboard.writeText(resultHtml); }
    catch { codeRef.current?.select(); document.execCommand("copy"); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ══════════════════════════════════════════════════
  // 편집 옵션 UI (탭 간 공용)
  // ══════════════════════════════════════════════════
  const OptionPanel = ({ showModel }: { showModel?: boolean }) => (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
      <p className="text-xs font-semibold text-gray-600 mb-3">편집 옵션</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {showModel && (
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">모델</label>
            <select
              value={aiOptions.model}
              onChange={(e) => setAi("model", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-opus-4-8">Claude Opus 4.8</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">소제목 개수</label>
          <input type="number" min={1} max={8} value={aiOptions.subtitleCount}
            onChange={(e) => setAi("subtitleCount", Math.max(1, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">강조 (최소~최대)</label>
          <div className="flex items-center gap-1">
            <input type="number" min={1} max={30} value={aiOptions.emphasisMin}
              onChange={(e) => setAi("emphasisMin", Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-gray-400 text-xs flex-shrink-0">~</span>
            <input type="number" min={1} max={30} value={aiOptions.emphasisMax}
              onChange={(e) => setAi("emphasisMax", Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
        네이버 블로그 원고 꾸밈 도구
      </h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        소제목은 35자 이하 단독 줄로 입력 · 단락은 빈 줄로 구분
      </p>

      {/* ── 원고 입력 | 변호사 선택 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 원고 입력 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">블로그 원고 입력</label>
          <p className="text-xs text-gray-400 mb-3">
            제목 없이 원문부터 바로 작성하세요.
          </p>
          <textarea
            className="w-full h-72 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={"본문 내용...\n\n본문 내용..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {/* 키워드 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">메인키워드</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 이혼 소송" value={keywordOptions.mainKeyword}
                onChange={(e) => setKw("mainKeyword", e.target.value)} />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-gray-400">목표 횟수</span>
                <input type="number" min={1} max={20} value={keywordOptions.mainKeywordCount}
                  onChange={(e) => setKw("mainKeywordCount", Math.max(1, Number(e.target.value)))}
                  className="w-14 border border-gray-200 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-300" />
                <span className="text-xs text-gray-400">회</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">서브키워드</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예) 위자료 청구" value={keywordOptions.subKeyword}
                onChange={(e) => setKw("subKeyword", e.target.value)} />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-gray-400">목표 횟수</span>
                <input type="number" min={1} max={20} value={keywordOptions.subKeywordCount}
                  onChange={(e) => setKw("subKeywordCount", Math.max(1, Number(e.target.value)))}
                  className="w-14 border border-gray-200 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-300" />
                <span className="text-xs text-gray-400">회</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">키워드 미입력 시 삽입 없이 진행합니다.</p>
        </div>

        {/* 변호사 프리셋 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">변호사 선택</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESETS.map((p, i) => {
              const isSelected = selectedPreset === i;
              return (
                <button key={p.name} onClick={() => setSelectedPreset(i)} className="flex flex-col items-center gap-1 group">
                  <div className="w-full h-11 rounded-lg flex items-center justify-center text-sm transition-all"
                    style={{ backgroundColor: p.bgColor, color: p.darkBg ? "#ffffff" : p.textColor, fontWeight: p.useBold ? "bold" : "normal", outline: isSelected ? "3px solid #1d4ed8" : "2px solid transparent", outlineOffset: "2px" }}>
                    가나다
                  </div>
                  <span className="text-xs text-center leading-tight px-0.5"
                    style={{ color: isSelected ? "#1d4ed8" : "#6b7280", fontWeight: isSelected ? 600 : 400 }}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">선택: <span className="text-blue-600">{preset.name}</span></p>
            <div className="flex flex-col gap-1.5 text-xs">
              <span style={{ color: preset.textColor, fontWeight: preset.useBold ? "bold" : "normal", textDecoration: preset.textWithUnderline ? "underline" : "none" }}>
                글자색{preset.textWithUnderline ? " + 밑줄" : ""}{preset.useBold ? " + 굵게" : ""} 예시 · {preset.textColor}
              </span>
              <span className="px-1 py-0.5 rounded inline-block" style={{ fontWeight: preset.useBold ? "bold" : "normal", backgroundColor: preset.bgColor, color: preset.darkBg ? "#ffffff" : "#333" }}>
                배경색 예시{preset.darkBg ? " (흰글씨)" : ""} · {preset.bgColor}
              </span>
              <span className="underline text-gray-700" style={{ fontWeight: preset.useBold ? "bold" : "normal" }}>밑줄 예시</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 편집 모드 탭 ── */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["claude", "manual", "mock"] as EditMode[]).map((mode) => {
          const labels: Record<EditMode, string> = {
            claude: "Claude 자동 편집",
            manual: "Claude Pro 수동 편집",
            mock: "Mock 자동 편집",
          };
          return (
            <button key={mode} onClick={() => setEditMode(mode)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                editMode === mode ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {labels[mode]}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          Claude 자동 편집 탭
      ══════════════════════════════════════════════════ */}
      {editMode === "claude" && (
        <div className="mb-8">
          <OptionPanel showModel />

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Claude 자동 편집</p>
            <p className="text-xs text-blue-500 mb-4">
              원고를 Claude AI가 직접 읽고 소제목·강조·키워드를 편집합니다.
              결과는 미리보기에서 확인 후 적용할 수 있습니다.
            </p>
            <button
              onClick={handleClaudeAutoEdit}
              disabled={!content.trim() || isGenerating}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isGenerating ? "Claude 편집 중..." : "Claude 자동 편집 시작"}
            </button>
            {claudeError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-xs flex items-start gap-1.5">
                  <span className="flex-shrink-0 font-bold">오류</span>
                  <span>{claudeError}</span>
                </p>
                <p className="text-red-400 text-xs mt-1">
                  API Key가 설정되어 있는지 확인하세요. (.env.local → ANTHROPIC_API_KEY=sk-ant-...)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Claude Pro 수동 편집 탭
      ══════════════════════════════════════════════════ */}
      {editMode === "manual" && (
        <div className="space-y-4 mb-8">
          <OptionPanel />

          {/* 1단계: 프롬프트 생성 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">1</span>
                  Claude 프롬프트 생성
                </p>
                <p className="text-xs text-gray-400 mt-1 ml-7">
                  버튼을 눌러 프롬프트를 생성하고 Claude Pro에 붙여넣으세요.
                </p>
              </div>
              <button onClick={handleGeneratePrompt} disabled={!content.trim()}
                className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                프롬프트 생성
              </button>
            </div>
            {claudePrompt && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">생성된 프롬프트</p>
                  <div className="flex gap-2">
                    <button onClick={() => promptRef.current?.select()} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">전체 선택</button>
                    <button onClick={handleCopyPrompt} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      {promptCopied ? "복사됨!" : "프롬프트 복사"}
                    </button>
                  </div>
                </div>
                <textarea ref={promptRef} readOnly value={claudePrompt}
                  className="w-full h-52 border border-gray-200 rounded-lg p-3 text-xs font-mono resize-none bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <p className="text-xs text-blue-500 mt-2">
                  ↑ 복사 후 Claude Pro 또는 Claude Code 채팅에 붙여넣으세요.
                </p>
              </div>
            )}
          </div>

          {/* 2단계: JSON 붙여넣기 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mr-2">2</span>
              Claude 결과 JSON 붙여넣기
            </p>
            <p className="text-xs text-gray-400 mt-1 mb-3 ml-7">
              Claude가 반환한 JSON을 아래에 붙여넣고 "결과 적용"을 누르세요.
            </p>
            <textarea value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }}
              placeholder={'{\n  "intro": { "paragraphs": [...], "highlights": [...] },\n  "sections": [ { "heading": "1. 소제목", ... } ]\n}'}
              className="w-full h-48 border border-gray-300 rounded-lg p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {jsonError && (
              <p className="text-red-500 text-xs mt-2 flex items-start gap-1">
                <span className="flex-shrink-0">⚠</span><span>{jsonError}</span>
              </p>
            )}
            <div className="flex justify-end mt-3">
              <button onClick={handleApplyJson} disabled={!jsonInput.trim()}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                결과 적용 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Mock 자동 편집 탭
      ══════════════════════════════════════════════════ */}
      {editMode === "mock" && (
        <div className="mb-8">
          <OptionPanel />
          <div className="text-center">
            <button onClick={handleMockGenerate} disabled={!content.trim() || isGenerating}
              className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-xl shadow hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              {isGenerating ? "생성 중..." : "Mock 자동 편집"}
            </button>
            <p className="text-xs text-gray-400 mt-2">규칙 기반 AI 시뮬레이션 (API 없이 동작)</p>
          </div>
        </div>
      )}

      {/* ── AI 편집 미리보기 (모든 탭 공통) ── */}
      {pendingHtml && (
        <div className="mb-8">
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-blue-800">편집 결과 미리보기</p>
                <p className="text-xs text-blue-500 mt-0.5">결과를 확인한 후 적용하세요.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDiscardPending} className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
                <button onClick={handleApplyPending} className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">적용하기</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-blue-100 p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">미리보기</p>
                <div className="text-sm leading-relaxed max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: pendingHtml }} />
              </div>
              <div className="bg-white rounded-lg border border-blue-100 p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">HTML 코드</p>
                <textarea readOnly value={pendingHtml} className="w-full h-64 text-xs font-mono resize-none bg-gray-50 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 최종 결과 (모든 탭 공통) ── */}
      {resultHtml && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">미리보기</p>
            <div className="text-sm leading-relaxed border border-gray-100 rounded-lg p-4 min-h-60 max-h-[600px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: resultHtml }} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">HTML 코드</p>
              <div className="flex gap-2">
                <button onClick={() => codeRef.current?.select()} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">전체 선택</button>
                <button onClick={handleCopy} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  {copied ? "복사됨!" : "복사하기"}
                </button>
              </div>
            </div>
            <textarea ref={codeRef} readOnly value={resultHtml}
              className="w-full h-[520px] border border-gray-200 rounded-lg p-3 text-xs font-mono resize-none bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <p className="text-xs text-gray-400 mt-2">
              * 네이버 블로그 편집기 → HTML 보기 모드에 붙여넣기 하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
