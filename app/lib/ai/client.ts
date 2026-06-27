/**
 * Claude API 클라이언트
 * 실제 Anthropic SDK 호출은 서버 사이드 /api/edit-blog route에서 수행한다.
 * 프론트엔드는 API Key가 노출되지 않도록 이 함수를 통해 route를 호출한다.
 */

import type { ClaudeResponse, CallClaudeParams } from "./types";

/**
 * Claude API를 호출하여 편집 결과 JSON을 받는다.
 * - 성공: ClaudeResponse 반환
 * - API Key 미설정 / 네트워크 오류 / 파싱 실패: null 반환 → 호출자가 mock으로 폴백
 */
export async function callClaude(params: CallClaudeParams): Promise<ClaudeResponse | null> {
  try {
    const res = await fetch("/api/edit-blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.success ? (result.data as ClaudeResponse) : null;
  } catch {
    return null;
  }
}
