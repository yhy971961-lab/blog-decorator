/**
 * Mock AI 편집기
 * Claude API 연결 전까지 사용하는 규칙 기반 AI 시뮬레이션.
 */

import type { Section, DecoratedSentence, DecoType, Preset, KeywordOptions, AiOptions } from "./types";
import { splitSentences } from "./sectionBuilder";
import { buildHtml } from "./htmlBuilder";

// ─────────────────────────────────────────────────────────
// 1. 원고 → 문단 배열 (빈 줄 기준 분리, 기존 소제목 줄 제거)
// ─────────────────────────────────────────────────────────

function extractParagraphs(raw: string): string[][] {
  return raw
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .filter((line) => !/^\s*\d+\./.test(line.trim()))
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .map((joined) => splitSentences(joined))
    .filter((sents) => sents.length > 0);
}

// ─────────────────────────────────────────────────────────
// 2. 문단 배열 → intro + N 섹션 (문단 단위로만 분할)
// ─────────────────────────────────────────────────────────

function divideParagraphs(
  paragraphs: string[][],
  subtitleCount: number,
): { introParagraphs: string[][]; sectionParagraphs: string[][][] } {
  if (paragraphs.length === 0) {
    return { introParagraphs: [], sectionParagraphs: Array.from({ length: subtitleCount }, () => []) };
  }

  if (paragraphs.length === 1) {
    const sents = paragraphs[0];
    const introCount = Math.min(3, Math.floor(sents.length * 0.2));
    const intro = sents.slice(0, introCount);
    const body = sents.slice(introCount);
    const size = Math.ceil(body.length / subtitleCount);
    const sectionParagraphs = Array.from({ length: subtitleCount }, (_, i) => {
      const chunk = body.slice(i * size, (i + 1) * size);
      return chunk.length > 0 ? [chunk] : ([] as string[][]);
    });
    return { introParagraphs: intro.length > 0 ? [intro] : [], sectionParagraphs };
  }

  const [first, ...body] = paragraphs;
  const size = Math.max(1, Math.ceil(body.length / subtitleCount));
  const sectionParagraphs: string[][][] = Array.from({ length: subtitleCount }, () => []);
  body.forEach((para, i) => {
    sectionParagraphs[Math.min(Math.floor(i / size), subtitleCount - 1)].push(para);
  });
  return { introParagraphs: [first], sectionParagraphs };
}

// ─────────────────────────────────────────────────────────
// 3. 법률 중요도 점수
// ─────────────────────────────────────────────────────────

function legalScore(s: string): number {
  let score = 0;

  if (/처벌|징역|벌금|과태료|형량|실형|구속/.test(s))                          score += 5;
  if (/법 제\d+조|제\d+조|성립 요건|구성 요건|기준이|기준에|해당|인정/.test(s)) score += 4;
  if (/증거|진술|수사|재판|기소|자백|조사|경찰|검찰|공판/.test(s))              score += 4;
  if (/초기 대응|초기 진술|초기에|적극적으로|대응 방법/.test(s))                score += 3;
  if (/합의|피해 배상|손해배상|민사|배상/.test(s))                              score += 2;
  if (/감형|집행유예|기소유예|불기소|선처|전과|초범/.test(s))                   score += 2;

  // 도입·광고·짧은 문장 감점
  if (/안녕하세요|많은 분들|고민하시는|궁금하신|도움이 되|알아보겠습니다|살펴보겠습니다/.test(s)) score -= 5;
  if (/법무법인|법률사무소|사무소에서|상담 문의|연락 주세요|무료 상담|전화 주세요/.test(s))      score -= 5;
  if (s.length < 15) score -= 10;

  return score;
}

// ─────────────────────────────────────────────────────────
// 4. 법령 조항 감지 (제X조, 제X조 제Y항 등) → 항상 bg + forceBold
// ─────────────────────────────────────────────────────────

const LAW_ARTICLE_RE = /(?:형법|민법|상법|특가법|특경법|도로교통법|성폭력처벌법|아동복지법|근로기준법|저작권법)?[^\S\n]?제\d+조(?:의\d+)?(?:[^\S\n]?제\d+항(?:[^\S\n]?제\d+호)?)?/;

function detectLawArticle(s: string): string | undefined {
  const m = s.match(LAW_ARTICLE_RE);
  return m ? m[0].trim() : undefined;
}

// ─────────────────────────────────────────────────────────
// 5. 구절 추출 (따옴표 > 법률 수치/용어 패턴)
// ─────────────────────────────────────────────────────────

function extractQuotedPhrase(s: string): string | undefined {
  const dbl = s.match(/[""""][^""""\n]{4,}[""""]/);
  if (dbl) return dbl[0];
  const sgl = s.match(/[''][^''\n]{4,}['']/);
  if (sgl) return sgl[0];
  return undefined;
}

const LEGAL_PHRASE_PATTERNS: RegExp[] = [
  /\d+년 이[상하]의? 징역/,
  /\d+개월 이[상하]의? 징역/,
  /\d+억 원 이[상하]의? 벌금/,
  /\d+만 원 이[상하]의? 벌금/,
  /특가법|특경법|특정경제범죄|업무상 횡령|업무상 배임/,
  /초기 대응|초기 진술/,
  /증거 확보|증거 인멸|증거 보전/,
  /성립 요건|구성 요건/,
  /집행유예|기소유예|불기소처분/,
  /고의성[이가] 인정|고의성 여부/,
  /수사 초기|수사 단계|수사 과정/,
  /피해 규모|피해 금액|피해 금원/,
  /실형[이을]|구속 수사|구속 영장/,
  /근거 있는 진술|초기 진술의 방향/,
];

function extractLegalPhrase(s: string): string | undefined {
  for (const p of LEGAL_PHRASE_PATTERNS) {
    const m = s.match(p);
    if (m) return m[0];
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────
// 6. 강조 적용
//    0단계: 법령 조항 → bg + forceBold (구절 강조)
//    1단계: 따옴표 문장 → text 강조 (따옴표 구절만)
//    2단계: 고득점 문장 → bg / underline 교대 (구절 or 전문)
// ─────────────────────────────────────────────────────────

function applyMockDecorations(
  sentences: string[],
  sectionIndex: number,   // -1이면 intro
  preset: Preset,
  maxDecos: number,
): DecoratedSentence[] {
  if (maxDecos <= 0 || sentences.length === 0) return [];

  const MIN_SCORE = 3;
  const allowed = preset.allowedDecos as DecoType[];
  if (allowed.length === 0) return [];

  const decorated: DecoratedSentence[] = [];
  const used = new Set<string>();

  // 0단계: 법령 조항 → bg + forceBold
  if (allowed.includes('bg')) {
    for (const s of sentences) {
      if (decorated.length >= maxDecos) break;
      if (used.has(s)) continue;
      const lawPhrase = detectLawArticle(s);
      if (lawPhrase) {
        decorated.push({ sentence: s, deco: 'bg', phrase: lawPhrase, forceBold: true });
        used.add(s);
      }
    }
  }

  // 1단계: 따옴표 문장 → text 강조
  if (allowed.includes('text') && decorated.length < maxDecos) {
    for (const s of sentences) {
      if (decorated.length >= maxDecos) break;
      if (used.has(s)) continue;
      const quotedPhrase = extractQuotedPhrase(s);
      if (quotedPhrase) {
        // emphasizeFullSentence이면 전문 강조, 아니면 따옴표 구절만
        const phrase = preset.emphasizeFullSentence ? undefined : quotedPhrase;
        decorated.push({ sentence: s, deco: 'text', ...(phrase ? { phrase } : {}) });
        used.add(s);
      }
    }
  }

  // 2단계: 중요도 점수 기반 강조
  const remaining = maxDecos - decorated.length;
  if (remaining > 0) {
    const fillDecos: DecoType[] = allowed.filter((d) => d !== 'text');
    if (fillDecos.length === 0) fillDecos.push(...allowed);

    const offset = sectionIndex < 0 ? 0 : sectionIndex % fillDecos.length;

    const candidates = sentences
      .filter((s) => !used.has(s))
      .map((s) => ({ s, score: legalScore(s) }))
      .filter((item) => item.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, remaining);

    candidates.forEach((item, i) => {
      const deco = fillDecos[(i + offset) % fillDecos.length];

      let phrase: string | undefined;
      if (!preset.emphasizeFullSentence) {
        phrase = extractQuotedPhrase(item.s) ?? extractLegalPhrase(item.s);
        // 너무 짧은 구절은 전문 강조로 대체
        if (phrase && phrase.length < 5) phrase = undefined;
      }

      decorated.push({ sentence: item.s, deco, ...(phrase ? { phrase } : {}) });
      used.add(item.s);
    });
  }

  // 원문 순서로 재정렬
  const order = new Map(sentences.map((s, i) => [s, i]));
  decorated.sort((a, b) => (order.get(a.sentence) ?? 0) - (order.get(b.sentence) ?? 0));

  return decorated;
}

// ─────────────────────────────────────────────────────────
// 7. 강조 개수 계산 (10문장 이상이면 5개)
// ─────────────────────────────────────────────────────────

function calcDecoMax(sentenceCount: number): number {
  if (sentenceCount >= 10) return 5;
  return Math.min(4, Math.max(2, Math.ceil(sentenceCount * 0.4)));
}

// ─────────────────────────────────────────────────────────
// 8. 소제목 생성
// ─────────────────────────────────────────────────────────

interface SubtitleCluster { test: RegExp; templates: string[] }

const SUBTITLE_CLUSTERS: SubtitleCluster[] = [
  { test: /성립|요건|기준|해당|인정|구성요건/,
    templates: ['성립 요건은 이렇게 판단합니다', '어떤 경우에 해당하는지 확인해야 합니다', '기준을 정확히 알아야 대응할 수 있습니다', '성립 여부부터 따져봐야 합니다'] },
  { test: /처벌|징역|벌금|형량|과태료|실형/,
    templates: ['처벌 수위는 어느 정도일까요', '형사처벌 기준을 반드시 확인해야 합니다', '징역과 벌금, 어떻게 결정될까요', '처벌이 얼마나 무거운지 알아야 합니다'] },
  { test: /수사|조사|경찰|검찰|압수|소환|출석/,
    templates: ['수사 과정에서 이 부분을 주의해야 합니다', '실제 수사에서는 이런 부분을 중요하게 봅니다', '경찰 조사, 어떻게 대응해야 할까요', '수사 단계에서 놓치면 안 되는 것들이 있습니다'] },
  { test: /증거|진술|자백|녹취|CCTV|통장|자료/,
    templates: ['증거와 진술 관리가 핵심입니다', '초기 진술이 사건을 좌우합니다', '증거 확보가 결과를 결정합니다', '이 단계에서 증거 대응이 가장 중요합니다'] },
  { test: /재판|판결|선고|공판|기소|불기소/,
    templates: ['재판에서는 이 부분을 중요하게 봅니다', '기소 여부가 갈리는 기준이 있습니다', '판결에 영향을 미치는 핵심 요소입니다', '재판 결과를 바꿀 수 있는 요소들입니다'] },
  { test: /합의|피해|배상|민사|손해배상/,
    templates: ['합의 여부가 중요하게 작용합니다', '피해 배상 문제도 함께 살펴봐야 합니다', '민사 책임은 별개로 따져야 합니다', '합의가 형사 처벌에 미치는 영향이 있습니다'] },
  { test: /대응|변호사|상담|준비|조치|대처/,
    templates: ['초기 대응이 결과를 크게 바꿀 수 있습니다', '이 시점을 놓치면 불리해집니다', '어떻게 대응하느냐가 핵심입니다', '지금 당장 해야 할 일이 있습니다'] },
  { test: /집행유예|감형|전과|초범|재범|선처/,
    templates: ['집행유예 가능성을 따져봐야 합니다', '감형 요소를 적극적으로 활용해야 합니다', '전과 기록 여부가 영향을 미칩니다', '초범과 재범, 처벌이 달라집니다'] },
];

const DEFAULT_SUBTITLE_TEMPLATES = [
  '이 부분을 반드시 확인해야 합니다',
  '실무에서 자주 문제가 되는 부분입니다',
  '알아두면 결과가 달라집니다',
  '핵심 내용을 정리해 드립니다',
];

function generateSubtitle(sentences: string[], subtitleIndex: number): string {
  const scored = SUBTITLE_CLUSTERS
    .map((c) => ({ c, score: sentences.filter((s) => c.test.test(s)).length }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const templates = best.score > 0 ? best.c.templates : DEFAULT_SUBTITLE_TEMPLATES;
  return `${subtitleIndex + 1}. ${templates[subtitleIndex % templates.length]}`;
}

// ─────────────────────────────────────────────────────────
// 9. 키워드 삽입
// ─────────────────────────────────────────────────────────

function injectKeywordInto(sections: Section[], kw: string, isMain: boolean): Section[] {
  if (!kw.trim()) return sections;
  const allText = sections.flatMap((s) => s.sentences).join(' ');
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

// ─────────────────────────────────────────────────────────
// 10. 진입점
// ─────────────────────────────────────────────────────────

export function mockAnalyze(
  raw: string,
  preset: Preset,
  keywordOptions: KeywordOptions,
  aiOptions: AiOptions,
): string {
  const paragraphs = extractParagraphs(raw);
  if (paragraphs.length === 0) return '';

  const { introParagraphs, sectionParagraphs } = divideParagraphs(paragraphs, aiOptions.subtitleCount);

  let builtSections: Section[] = [];

  // 도입부 — 소제목 없음, 중요 문장 있으면 강조
  const introSentences = introParagraphs.flat();
  if (introSentences.length > 0) {
    builtSections.push({
      subtitle: null,
      sentences: introSentences,
      decorated: applyMockDecorations(introSentences, -1, preset, calcDecoMax(introSentences.length)),
    });
  }

  // 본문 섹션
  sectionParagraphs.forEach((sectionParas, idx) => {
    const sentences = sectionParas.flat();
    if (sentences.length === 0) return;
    builtSections.push({
      subtitle: generateSubtitle(sentences, idx),
      sentences,
      decorated: applyMockDecorations(sentences, idx, preset, calcDecoMax(sentences.length)),
    });
  });

  builtSections = injectKeywordInto(builtSections, keywordOptions.mainKeyword, true);
  builtSections = injectKeywordInto(builtSections, keywordOptions.subKeyword, false);

  return buildHtml(builtSections, preset);
}
