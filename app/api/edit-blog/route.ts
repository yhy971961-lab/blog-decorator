import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildClaudeProPrompt } from "@/app/lib/ai/claudeProPrompt";
import { PRESETS } from "@/app/lib/presets";
import type { KeywordOptions, AiOptions } from "@/app/lib/types";

interface RequestBody {
  rawText: string;
  presetName: string;
  keywordOptions: KeywordOptions;
  aiOptions: AiOptions;
}

function extractJson(text: string): string {
  // ```json ... ``` 블록 우선
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) return codeBlock[1].trim();
  // 중괄호 오브젝트 추출
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0].trim();
  return text.trim();
}

const VALID_MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
] as const;

export async function POST(request: NextRequest) {
  // API Key 확인
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요." },
      { status: 500 },
    );
  }

  // 요청 파싱
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { rawText, presetName, keywordOptions, aiOptions } = body;

  if (!rawText?.trim()) {
    return NextResponse.json({ success: false, error: "원고가 비어 있습니다." }, { status: 400 });
  }

  // 모델 유효성 검사
  const model = VALID_MODELS.includes(aiOptions?.model as typeof VALID_MODELS[number])
    ? aiOptions.model
    : "claude-sonnet-4-6";

  // Claude API 호출
  const client = new Anthropic({ apiKey });
  const preset = PRESETS.find((p) => p.name === presetName);
  const prompt = buildClaudeProPrompt(rawText, presetName, keywordOptions, aiOptions, preset?.maxPhraseHighlights);

  let responseText: string;
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude API 호출 오류";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }

  // JSON 추출 및 파싱
  const jsonStr = extractJson(responseText);
  try {
    const data = JSON.parse(jsonStr);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Claude 응답을 JSON으로 파싱할 수 없습니다.", raw: responseText },
      { status: 422 },
    );
  }
}
