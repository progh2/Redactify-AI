/**
 * Helper utility to perform HTTP fetch requests with a custom timeout limit using AbortController.
 * Default timeout increased to 90 seconds to accommodate local Ollama model loading into VRAM/RAM.
 */

export async function fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`⏱️ AI 응답 시간 초과 (타임아웃 ${Math.round(timeoutMs / 1000)}초): 로컬 모델 로딩 또는 생성 시간이 길어져 요청이 중단되었습니다. 설정에서 타임아웃을 늘리거나 서버 상태를 확인하세요.`);
    }
    throw error;
  }
}
