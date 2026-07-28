/**
 * Helper utility to perform HTTP fetch requests with a custom timeout limit using AbortController.
 */

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
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
      throw new Error(`⏱️ AI 응답 시간 초과 (타임아웃 ${Math.round(timeoutMs / 1000)}초): 일정 시간 동안 답변이 없어 요청이 자동 중단되었습니다.`);
    }
    throw error;
  }
}
