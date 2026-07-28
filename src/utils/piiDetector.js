/**
 * AI-First PII Detection Engine - Queries AI First for Comprehensive PII Identification
 * Captures Names, Student IDs (학번), Employee IDs (사번), RRN, Phone, Address, Bank Accounts, etc.
 */

import { fetchWithTimeout } from './fetchWithTimeout';

export const PII_TYPES = {
  NAME: { key: 'NAME', name: '성명 / 인명 (AI)', color: '#a855f7', category: 'AI' },
  ID_NUM: { key: 'ID_NUM', name: '학번 / 사번 / 식별번호 (AI)', color: '#f59e0b', category: 'AI' },
  RRN: { key: 'RRN', name: '주민등록번호 / 외국인번호', color: '#ef4444', category: 'Regex' },
  PHONE: { key: 'PHONE', name: '전화번호 / 핸드폰', color: '#f97316', category: 'Regex' },
  EMAIL: { key: 'EMAIL', name: '이메일 주소', color: '#3b82f6', category: 'Regex' },
  ACCOUNT: { key: 'ACCOUNT', name: '계좌번호 / 카드번호', color: '#8b5cf6', category: 'Regex' },
  PASSPORT: { key: 'PASSPORT', name: '여권번호 / 운전면허번호', color: '#ec4899', category: 'Regex' },
  ADDRESS: { key: 'ADDRESS', name: '상세주소 (AI)', color: '#06b6d4', category: 'AI' },
  BUSINESS_NO: { key: 'BUSINESS_NO', name: '사업자등록번호', color: '#14b8a6', category: 'Regex' },
  SENSITIVE: { key: 'SENSITIVE', name: '기타 민감정보 (AI)', color: '#eab308', category: 'AI' },
  PATTERN: { key: 'PATTERN', name: '반복 서식 패턴', color: '#2563eb', category: 'Pattern' },
  MANUAL: { key: 'MANUAL', name: '사용자 수동 지정', color: '#10b981', category: 'Manual' },
};

const REGEX_PATTERNS = [
  {
    type: PII_TYPES.RRN,
    regex: /(?:\b\d{6}[-─\s]?[1-8]\d{6}\b)|(?:\b\d{13}\b)/g,
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
  // 학번 / 사번 패턴 추가 (예: 2012-12311 또는 20231234)
  {
    type: PII_TYPES.ID_NUM,
    regex: /\b\d{4}[-─\s]?\d{4,6}\b/g,
  },
];

/**
 * 1. AI-First Detection across all pages
 */
export async function detectLLMPII(pagesTextData, config, onProgress) {
  const {
    provider = 'ollama',
    ollamaUrl = 'http://localhost:11434',
    ollamaModel = 'llama3',
    claudeKey = '',
    openaiKey = '',
    timeoutSeconds = 90,
  } = config;

  const detections = [];
  const totalPages = pagesTextData.length;

  for (let i = 0; i < totalPages; i++) {
    const pageData = pagesTextData[i];
    if (onProgress) onProgress(i + 1, totalPages);

    const fullPageText = pageData.items.map((it) => it.text).join(' ');
    if (!fullPageText.trim()) continue;

    try {
      const piiItems = await callLLMForPII(fullPageText, provider, {
        ollamaUrl,
        ollamaModel,
        claudeKey,
        openaiKey,
        timeoutSeconds,
      });

      piiItems.forEach((piiEntity, idx) => {
        const targetText = piiEntity.text || piiEntity.value;
        if (!targetText || targetText.trim().length < 2) return;

        // Match targetText back to exact page text items
        pageData.items.forEach((item) => {
          if (item.text.includes(targetText) || targetText.includes(item.text.trim())) {
            let typeKey = 'SENSITIVE';
            const cat = (piiEntity.category || '').toUpperCase();

            if (cat.includes('NAME') || cat.includes('성명') || cat.includes('이름')) typeKey = 'NAME';
            else if (cat.includes('ID') || cat.includes('학번') || cat.includes('사번')) typeKey = 'ID_NUM';
            else if (cat.includes('ADDRESS') || cat.includes('주소')) typeKey = 'ADDRESS';
            else if (cat.includes('PHONE') || cat.includes('전화')) typeKey = 'PHONE';
            else if (cat.includes('ACCOUNT') || cat.includes('계좌')) typeKey = 'ACCOUNT';

            const typeObj = PII_TYPES[typeKey] || PII_TYPES.SENSITIVE;
            const uniqueId = `ai_p${pageData.pageIndex}_i${idx}_${item.id}`;

            if (!detections.some((d) => d.id === uniqueId)) {
              detections.push({
                id: uniqueId,
                pageIndex: pageData.pageIndex,
                pageNumber: pageData.pageNumber,
                type: typeObj.key,
                typeName: typeObj.name,
                typeColor: typeObj.color,
                category: 'AI',
                detectedText: item.text,
                fullItemText: item.text,
                bounds: {
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height,
                  pdfY: item.pdfY,
                },
                status: 'approved', // Auto-approve AI findings by default!
              });
            }
          }
        });
      });
    } catch (err) {
      console.warn(`AI analysis warning on page ${pageData.pageNumber}:`, err.message);
    }
  }

  return detections;
}

/**
 * 2. Regex Complementary Detection
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

          const uniqueId = `det_${pageIndex}_${item.id}_${type.key}_${match.index}`;

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
              status: 'approved', // Auto-approve Regex findings
            });
          }
        }
      });
    });
  });

  return detections;
}

async function callLLMForPII(text, provider, credentials) {
  const prompt = `Analyze the following document text and identify ALL Personal Identifiable Information (PII) and sensitive personal data.
Identify any of the following:
1. Person Names (성명, 이름)
2. Student Numbers / Employee IDs / Member IDs (학번, 사번, 식별번호, 회원번호)
3. National ID / Resident Registration / Passports / Driver Licenses (주민등록번호, 외국인번호, 여권번호)
4. Phone Numbers / Mobile numbers (전화번호, 핸드폰번호)
5. Emails (이메일 주소)
6. Addresses / Locations (주소, 거주지)
7. Bank Account Numbers / Credit Cards (계좌번호, 카드번호)

Return ONLY a valid JSON array of objects with keys "text" and "category" (where category is one of "NAME", "ID_NUM", "PHONE", "EMAIL", "ADDRESS", "ACCOUNT", "SENSITIVE"). Do NOT return markdown formatting or extra text.

Document Text:
"${text}"`;

  const timeoutMs = (credentials.timeoutSeconds || 90) * 1000;

  if (provider === 'ollama') {
    const res = await fetchWithTimeout(
      `${credentials.ollamaUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: credentials.ollamaModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      },
      timeoutMs
    );

    if (!res.ok) throw new Error(`Ollama connection error (${res.status})`);
    const data = await res.json();
    return parseLLMJsonResponse(data.message?.content || '');
  }

  if (provider === 'openai') {
    const res = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
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
      },
      timeoutMs
    );
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);
    const data = await res.json();
    return parseLLMJsonResponse(data.choices[0]?.message?.content || '');
  }

  if (provider === 'claude') {
    const res = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': credentials.claudeKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      timeoutMs
    );
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
