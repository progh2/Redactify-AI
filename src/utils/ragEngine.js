/**
 * RAG (Retrieval-Augmented Generation) Engine for PDF Documents with Real-time Streaming
 */

import { fetchWithTimeout } from './fetchWithTimeout';

export function buildDocumentRAGIndex(pagesTextData) {
  const chunks = [];

  pagesTextData.forEach((page) => {
    const { pageNumber, pageIndex, items } = page;
    if (!items || items.length === 0) return;

    let currentChunkText = '';
    let currentItems = [];

    items.forEach((item) => {
      currentChunkText += ' ' + item.text;
      currentItems.push(item);

      if (currentChunkText.length >= 200) {
        chunks.push({
          id: `chunk_${pageIndex}_${chunks.length}`,
          pageNumber,
          pageIndex,
          text: currentChunkText.trim(),
          items: [...currentItems],
        });
        currentChunkText = '';
        currentItems = [];
      }
    });

    if (currentChunkText.trim()) {
      chunks.push({
        id: `chunk_${pageIndex}_${chunks.length}`,
        pageNumber,
        pageIndex,
        text: currentChunkText.trim(),
        items: [...currentItems],
      });
    }
  });

  return chunks;
}

export function retrieveRelevantChunks(query, chunks, topK = 4) {
  if (!query || !chunks || chunks.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK);
  }

  const scored = chunks.map((chunk) => {
    const chunkTextLower = chunk.text.toLowerCase();
    let score = 0;

    queryTerms.forEach((term) => {
      const occurrences = chunkTextLower.split(term).length - 1;
      score += occurrences * 2;
    });

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const results = scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.chunk);

  return results.length > 0 ? results : chunks.slice(0, topK);
}

/**
 * Ask Question using RAG pipeline with optional real-time streaming callback
 */
export async function askRAGQuestion(question, ragChunks, config, onChunk) {
  const {
    provider = 'ollama',
    ollamaUrl = 'http://localhost:11434',
    ollamaModel = 'llama3',
    claudeKey = '',
    openaiKey = '',
    timeoutSeconds = 90,
  } = config;

  const relevantChunks = retrieveRelevantChunks(question, ragChunks, 5);

  const contextText = relevantChunks
    .map((c) => `[페이지 ${c.pageNumber}]:\n"${c.text}"`)
    .join('\n\n');

  const systemPrompt = `You are an AI assistant specialized in document analysis and PII redaction.
Answer the user's question accurately based strictly on the provided document context below.
Provide clear, structured Korean answers with page number references like [P.1], [P.3].
If the context does not contain enough information, state that clearly.

=== Document Context ===
${contextText}
========================

User Question: ${question}`;

  let fullAnswerText = '';
  const timeoutMs = (timeoutSeconds || 90) * 1000;

  if (provider === 'ollama') {
    const res = await fetchWithTimeout(
      `${ollamaUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [{ role: 'user', content: systemPrompt }],
          stream: true, // Enable streaming to receive tokens instantly!
        }),
      },
      timeoutMs
    );

    if (!res.ok) throw new Error(`Ollama API error (${res.status}). Make sure Ollama server is running.`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const chunkContent = parsed.message?.content || '';
          if (chunkContent) {
            fullAnswerText += chunkContent;
            if (onChunk) onChunk(fullAnswerText);
          }
        } catch (e) {
          // ignore partial JSON parse error
        }
      }
    }

    if (!fullAnswerText && buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        fullAnswerText += parsed.message?.content || '';
      } catch (e) {}
    }
  } else if (provider === 'openai') {
    const res = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
        }),
      },
      timeoutMs
    );
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);
    const data = await res.json();
    fullAnswerText = data.choices[0]?.message?.content || '';
    if (onChunk) onChunk(fullAnswerText);
  } else if (provider === 'claude') {
    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: systemPrompt }],
        }),
      },
      timeoutMs
    );
    if (!res.ok) throw new Error(`Claude API error (${res.status})`);
    const data = await res.json();
    fullAnswerText = data.content[0]?.text || '';
    if (onChunk) onChunk(fullAnswerText);
  } else {
    fullAnswerText =
      `[Regex 전용 모드 답변]\n조회된 연관 문맥 (페이지: ${relevantChunks.map((c) => 'P.' + c.pageNumber).join(', ')}):\n\n` +
      relevantChunks.map((c) => `P.${c.pageNumber}: ${c.text}`).join('\n\n');
    if (onChunk) onChunk(fullAnswerText);
  }

  return {
    question,
    answer: fullAnswerText,
    referencedPages: [...new Set(relevantChunks.map((c) => c.pageNumber))],
    relevantChunks,
  };
}
