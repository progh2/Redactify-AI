import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PDFCanvasViewer from './components/PDFCanvasViewer';
import SettingsModal from './components/SettingsModal';
import PatternModal from './components/PatternModal';

import { loadPdfDocument, extractPageTextItems } from './utils/pdfEngine';
import { detectRegexPII, detectLLMPII } from './utils/piiDetector';
import { analyzeDocumentPatterns, replicateRedactionsToPatternPages } from './utils/patternAnalyzer';
import { applyRedactionsToPdf } from './utils/pdfRedactor';
import { generateSamplePdf } from './utils/samplePdfGenerator';
import { buildDocumentRAGIndex } from './utils/ragEngine';

export default function App() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBuffer, setPdfBuffer] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [pagesTextData, setPagesTextData] = useState([]);
  const [ragChunks, setRagChunks] = useState([]);
  const [detections, setDetections] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [ignoredTerms, setIgnoredTerms] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [patternModalTarget, setPatternModalTarget] = useState(null);

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('pdf_redactor_config');
    return saved
      ? JSON.parse(saved)
      : {
          provider: 'ollama',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
          claudeKey: '',
          openaiKey: '',
          timeoutSeconds: 90,
        };
  });

  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('pdf_redactor_config', JSON.stringify(newConfig));
  };

  const processPdf = async (buffer, name) => {
    setIsProcessing(true);
    setProcessingMessage('PDF 문서를 로드하고 텍스트 레이아웃을 추출 중입니다...');

    try {
      const { pdfDoc: doc, originalBuffer } = await loadPdfDocument(buffer);
      setPdfDoc(doc);
      setPdfBuffer(originalBuffer);
      setFileName(name);
      setPageCount(doc.numPages);
      setCurrentPage(1);

      // 1. Extract text items across all pages
      const extractedPages = [];
      for (let p = 1; p <= doc.numPages; p++) {
        setProcessingMessage(`페이지 텍스트 추출 중... (${p} / ${doc.numPages})`);
        const pageText = await extractPageTextItems(doc, p);
        extractedPages.push(pageText);
      }
      setPagesTextData(extractedPages);

      // 2. Build RAG Vector Context Index
      setProcessingMessage('RAG 문서 검색 색인을 구축 중입니다...');
      const chunks = buildDocumentRAGIndex(extractedPages);
      setRagChunks(chunks);

      // 3. ⭐️ 1차: AI 우선 식별 (AI-First PII Engine)
      let aiDetections = [];
      if (config.provider !== 'regex') {
        setProcessingMessage(`🤖 AI (${config.provider.toUpperCase()})로 성명(이름), 주소, 학번 등 전체 개인정보 식별 중...`);
        aiDetections = await detectLLMPII(extractedPages, config, (cur, total) => {
          setProcessingMessage(`🤖 AI 정밀 탐지 진행 중... (${cur} / ${total} 페이지)`);
        });
      }

      // 4. 2차: 보완 정규식(Regex) 탐지 (주민번호/전화/이메일/계좌)
      setProcessingMessage('⚡ 정규식(Regex) 보완 탐지 결합 중...');
      const regexDetections = detectRegexPII(extractedPages, ignoredTerms);

      // 5. 3차: 서식 양식 패턴 클러스터링
      const { patterns: detectedPatterns } = analyzeDocumentPatterns(extractedPages);
      setPatterns(detectedPatterns);

      // Combine AI & Regex detections with no duplicates
      const combined = [...aiDetections];
      regexDetections.forEach((rd) => {
        if (!combined.some((cd) => cd.pageIndex === rd.pageIndex && cd.detectedText.trim() === rd.detectedText.trim())) {
          combined.push(rd);
        }
      });

      setDetections(combined);
    } catch (err) {
      console.error('PDF Processing error:', err);
      alert(`PDF 분석 실패: ${err.message || '문서를 처리하는 중 오류가 발생했습니다.'}`);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await processPdf(buffer, file.name);
  };

  const handleGenerateSample = async () => {
    const sampleBytes = await generateSamplePdf();
    await processPdf(sampleBytes.buffer, 'sample_korean_pii_document.pdf');
  };

  const handleToggleDetectionStatus = (detId) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === detId ? { ...d, status: d.status === 'approved' ? 'pending' : 'approved' } : d))
    );
  };

  const handleToggleAllDetections = (approve) => {
    setDetections((prev) => prev.map((d) => ({ ...d, status: approve ? 'approved' : 'pending' })));
  };

  const handleIgnoreTerm = (term) => {
    if (!term || ignoredTerms.includes(term)) return;
    const newIgnored = [...ignoredTerms, term];
    setIgnoredTerms(newIgnored);
    setDetections((prev) => prev.filter((d) => !d.detectedText.toLowerCase().includes(term.toLowerCase())));
  };

  const handleRemoveIgnoreTerm = (term) => {
    setIgnoredTerms((prev) => prev.filter((t) => t !== term));
  };

  const handleAddManualRedaction = (manualData) => {
    const newDet = {
      id: `manual_${Date.now()}_${Math.random()}`,
      status: 'approved',
      ...manualData,
    };
    setDetections((prev) => [...prev, newDet]);
  };

  const handleApplyPatternMasking = (pattern) => {
    const sampleRedactions = detections.filter(
      (d) => d.pageNumber === pattern.samplePageNumber && d.status === 'approved'
    );

    if (sampleRedactions.length === 0) {
      alert(`대표 P.${pattern.samplePageNumber} 페이지에 승인된 마스킹 박스가 없습니다. 먼저 마스킹 영역을 확인해주세요.`);
      return;
    }

    const replicated = replicateRedactionsToPatternPages(sampleRedactions, pattern.pages, pagesTextData);

    setDetections((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filteredNew = replicated.filter((r) => !existingIds.has(r.id));
      return [...prev, ...filteredNew];
    });

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
  };

  const handleSaveRedactedPdf = async () => {
    if (!pdfBuffer) return;

    setIsProcessing(true);
    setProcessingMessage('PDF 내용 완전 삭제 및 비식별화(True Redaction) 처리 중...');

    try {
      const approvedByPage = {};
      detections
        .filter((d) => d.status === 'approved')
        .forEach((d) => {
          if (!approvedByPage[d.pageIndex]) approvedByPage[d.pageIndex] = [];
          approvedByPage[d.pageIndex].push(d);
        });

      const redactedPdfBytes = await applyRedactionsToPdf(pdfBuffer, approvedByPage);

      const blob = new Blob([redactedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.pdf$/i, '_redacted.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Save Redacted PDF Error:', err);
      alert(`비식별 PDF 저장 오류: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const approvedCount = detections.filter((d) => d.status === 'approved').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Navbar
        fileName={fileName}
        pageCount={pageCount}
        approvedCount={approvedCount}
        onFileSelect={handleFileSelect}
        onGenerateSample={handleGenerateSample}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSavePdf={handleSaveRedactedPdf}
        isProcessing={isProcessing}
        providerInfo={config.provider}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          detections={detections}
          patterns={patterns}
          ignoredTerms={ignoredTerms}
          currentPage={currentPage}
          ragChunks={ragChunks}
          config={config}
          onSelectDetection={(item) => setCurrentPage(item.pageNumber)}
          onToggleDetectionStatus={handleToggleDetectionStatus}
          onToggleAllDetections={handleToggleAllDetections}
          onIgnoreTerm={handleIgnoreTerm}
          onRemoveIgnoreTerm={handleRemoveIgnoreTerm}
          onApplyPatternMasking={(pat) => setPatternModalTarget(pat)}
          onJumpToPage={(p) => setCurrentPage(p)}
        />

        {pdfDoc ? (
          <PDFCanvasViewer
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={(p) => setCurrentPage(p)}
            detections={detections}
            onToggleDetectionStatus={handleToggleDetectionStatus}
            onAddManualRedaction={handleAddManualRedaction}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl">
              <span className="text-4xl">🛡️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Redactify AI - AI 우선 개인정보 탐지 시스템</h2>
            <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
              PDF를 불러오면 AI가 성명, 학번, 사번, 주소 등 모든 개인정보를 우선 정밀 탐지하여 누락 없이 마스킹합니다.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateSample}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold shadow-md transition flex items-center space-x-2"
              >
                <span>🧪 테스트용 샘플 PDF 로드</span>
              </button>
              <label className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition">
                <span>📂 내 PDF 파일 선택</span>
                <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-sm font-semibold text-slate-200">{processingMessage}</div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={saveConfig}
      />

      <PatternModal
        isOpen={!!patternModalTarget}
        onClose={() => setPatternModalTarget(null)}
        pattern={patternModalTarget}
        onConfirm={handleApplyPatternMasking}
      />
    </div>
  );
}
