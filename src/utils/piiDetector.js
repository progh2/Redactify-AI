/**
 * PII Detection Engine - Supports Regex Rules & LLM (Ollama, Claude, OpenAI)
 */

export const PII_TYPES = {
  RRN: { key: 'RRN', name: '주민등록번호 / 외국인번호', color: '#ef4444', category: 'Regex' },
  PHONE: { key: 'PHONE', name: '전화번호 / 핸드폰', color: '#f97316', category: 'Regex' },
  EMAIL: { key: 'EMAIL', name: '이메일 주소', color: '#3b82f6', category: 'Regex' },
  ACCOUNT: { key: 'ACCOUNT', name: '계좌번호 / 카드번호', color: '#8b5cf6', category: 'Regex' },
  PASSPORT: { key: 'PASSPORT', name: '여권번호 / 운전면허번호', color: '#ec4899', category: 'Regex' },
  BUSINESS_NO: { key: 'BUSINESS_NO', name: '사업자등록번호', color: '#14b8a6', category: 'Regex' },
  NAME: { key: 'NAME', name: '성명 / 인명 (LLM)', color: '#a855f7', category: 'LLM' },
  ADDRESS: { key: 'ADDRESS', name: '상세주소 (LLM)', color: '#06b6d4', category: 'LLM' },
  SENSITIVE: { key: 'SENSITIVE', name: '기타 민감정보 (LLM)', color: '#eab308', category: 'LLM' },
  PATTERN: { key: 'PATTERN', name: '반복 서식 패턴', color: '#2563eb', category: 'Pattern' },
  MANUAL: { key: 'MANUAL', name: '사용자 수동 지정', color: '#10b981', category: 'Manual' },
};

const REGEX_PATTERNS = [
  {
    type: PII_TYPES.RRN,
    regex: /(?:\b\d{6}[-─\s]?[1-4]\d{6}\b)|(?:\b\d{6}[-─\s]?[5-8]\d{6}\b)/g,
  },
  {
    type: PII_TYPES.PHONE,
    regex: /(?:01[016789][-─\s]?\d{3,4}[-─\s]?\d{4})|(?:0\d{1,2}[-─\s]?\d{3,4}[-─\s]?\d{4})/g,
  },
  {
    type: PII_TYPES.EMAIL,
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: PII_TYPES.ACCOUNT,
    regex: /\b(?:\d{3,6}[-─\s]\d{2,6}[-─\s]\d{3,6})|(?:\d{4}[-─\s]\d{4}[-─\s]\d{4}[-─\s]\d{4})\b/g,
  },
  {
    type: PII_TYPES.PASSPORT,
    regex: /\b[MSROG]\d{8}\b|\b\d{2}[-─\s]\d{2}[-─\s]\d{6}[-─\s]\d{2}\b/g,
  },
  {
    type: PII_TYPES.BUSINESS_NO,
    regex: /\b\d{3}[-─\s]\d{2}[-─\s]\d{5}\b/g,
  },
];

/**
 * 1. Fast Regex Detection across all pages
 */
export function detectRegexPII(pagesTextData, ignoredTerms = []) {
  const detections = [];
  const lowerIgnored = ignoredTerms.map((t) => t.toLowerCase());

  pagesTextData.forEach((pageData) => {
    const { pageIndex, pageNumber, items } = pageData;

    items.forEach((item) => {
      const text = item.text;
      if (!text || text.trim().length === 0) return;

      if (lowerIgnored.includes(text.toLowerCase())) return;

      REGEX_PATTERNS.forEach(({ type, regex }) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const matchedText = match[0];

          if (lowerIgnored.includes(matchedText.toLowerCase())) continue;

          // Unique ID using item.id, type.key, match index
          const uniqueId = `det_${pageIndex}_${item.id}_${type.key}_${match.index}`;

          // Prevent pushing duplicate entries with same unique ID
          if (!detections.some((d) => d.id === uniqueId)) {
            detections.push({
              id: uniqueId,
              pageIndex,
              pageNumber,
              type: type.key,
              typeName: type.name,
              typeColor: type.color,
              category: 'Regex',
              detectedText: matchedText,
              fullItemText: text,
              bounds: {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                pdfY: item.pdfY,
              },
              status: 'pending',
            });
          }
        }
      });
    });
  });

  return detections;
}

/**
 * 2. LLM Detection (Ollama / Claude / OpenAI)
 */
export async function detectLLMPII(pagesTextData, config, onProgress) {
  const { provider = 'ollama', ollamaUrl = 'http://localhost:11434', ollamaModel = 'llama3', claudeKey = '', openaiKey = '' } = config;

  const detections = [];
  const totalPages = pagesTextData.length;

  for (let i = 0; i < totalPages; i++) {
    const pageData = pagesTextData[i];
    if (onProgress) onProgress(i + 1, totalPages);

    const fullPageText = pageData.items.map((it) => it.text).join(' ');
    if (!fullPageText.trim()) continue;

    try {
      const piiItems = await callLLMForPII(fullPageText, provider, { ollamaUrl, ollamaModel, claudeKey, openaiKey });

      piiItems.forEach((piiEntity, idx) => {
        const targetText = piiEntity.text || piiEntity.value;
        if (!targetText) return;

        const matchedItem = pageData.items.find((item) => item.text.includes(targetText) || targetText.includes(item.text));

        if (matchedItem) {
          const typeKey = piiEntity.category === 'NAME' ? 'NAME' : piiEntity.category === 'ADDRESS' ? 'ADDRESS' : 'SENSITIVE';

          const typeObj = PII_TYPES[typeKey] || PII_TYPES.SENSITIVE;
          const uniqueId = `llm_p${pageData.pageIndex}_i${idx}_${matchedItem.id}`;

          if (!detections.some((d) => d.id === uniqueId)) {
            detections.push({
              id: uniqueId,
              pageIndex: pageData.pageIndex,
              pageNumber: pageData.pageNumber,
              type: typeObj.key,
              typeName: typeObj.name,
              typeColor: typeObj.color,
              category: 'LLM',
              detectedText: targetText,
              fullItemText: matchedItem.text,
              bounds: {
                x: matchedItem.x,
                y: matchedItem.y,
                width: matchedItem.width,
                height: matchedItem.height,
                pdfY: matchedItem.pdfY,
              },
              status: 'pending',
            });
          }
        }
      });
    } catch (err) {
      console.warn(`LLM analysis failed on page ${pageData.pageNumber}:`, err);
    }
  }

  return detections;
}

async function callLLMForPII(text, provider, credentials) {
  const prompt = `Analyze the following text from a document and identify all Personal Identifiable Information (PII) such as Names (성명), Addresses (주소), and sensitive personal identifiers.
  Return ONLY a valid JSON array of objects with keys "text" and "category" (where category is one of "NAME", "ADDRESS", "SENSITIVE"). Do NOT return markdown formatting or extra text.

  Document Text:
  "${text}"`;

  if (provider === 'ollama') {
    const res = await fetch(`${credentials.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: credentials.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama connection error (${res.status})`);
    const data = await res.json();
    return parseLLMJsonResponse(data.message?.content || '');
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);
    const data = await res.json();
    return parseLLMJsonResponse(data.choices[0]?.message?.content || '');
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': credentials.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error (${res.status})`);
    const data = await res.json();
    return parseLLMJsonResponse(data.content[0]?.text || '');
  }

  return [];
}

function parseLLMJsonResponse(rawText) {
  try {
    const jsonStart = rawText.indexOf('[');
    const jsonEnd = rawText.lastIndexOf(']');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonSubStr = rawText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonSubStr);
    }
    const parsed = JSON.parse(rawText);
    return Array.isArray(parsed) ? parsed : parsed.pii || [];
  } catch (e) {
    console.warn('Failed to parse LLM JSON response:', rawText);
    return [];
  }
}
