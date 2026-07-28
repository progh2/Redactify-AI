/**
 * Page Layout & Pattern Analyzer
 * Clusters multi-page documents by structural layout and enables batch pattern masking
 */

import { PII_TYPES } from './piiDetector';

/**
 * Analyze all pages in the PDF document to detect repeating page layout patterns.
 */
export function analyzeDocumentPatterns(pagesTextData) {
  if (!pagesTextData || pagesTextData.length <= 1) {
    return { patterns: [], totalPages: pagesTextData ? pagesTextData.length : 0 };
  }

  // 1. Generate structural layout fingerprint for each page
  const pageFingerprints = pagesTextData.map((pageData) => {
    const itemCount = pageData.items.length;

    // Grid matrix (4x4) distribution of text items on the page
    const grid = new Array(16).fill(0);
    const { pageWidth, pageHeight } = pageData;

    pageData.items.forEach((item) => {
      const col = Math.min(3, Math.floor((item.x / pageWidth) * 4));
      const row = Math.min(3, Math.floor((item.y / pageHeight) * 4));
      grid[row * 4 + col]++;
    });

    return {
      pageIndex: pageData.pageIndex,
      pageNumber: pageData.pageNumber,
      itemCount,
      gridSignature: grid.join('-'),
      items: pageData.items,
    };
  });

  // 2. Cluster pages by layout fingerprint similarity
  const clusters = {};

  pageFingerprints.forEach((fp) => {
    const key = `${fp.itemCount}_${fp.gridSignature}`;
    if (!clusters[key]) {
      clusters[key] = {
        id: `pat_${Object.keys(clusters).length + 1}`,
        name: `패턴 ${String.fromCharCode(65 + Object.keys(clusters).length)} 양식`,
        pages: [],
        samplePageIndex: fp.pageIndex,
        samplePageNumber: fp.pageNumber,
      };
    }
    clusters[key].pages.push(fp.pageNumber);
  });

  // Filter clusters that appear on at least 2 pages or group remaining as general
  const patterns = Object.values(clusters).filter((c) => c.pages.length >= 2);

  // If no exact matches, group pages by modulo intervals (e.g. 2-page or 3-page repeating forms)
  if (patterns.length === 0 && pagesTextData.length >= 4) {
    const evenPages = pagesTextData.filter((_, idx) => idx % 2 === 0).map((p) => p.pageNumber);
    const oddPages = pagesTextData.filter((_, idx) => idx % 2 === 1).map((p) => p.pageNumber);

    patterns.push(
      {
        id: 'pat_auto_even',
        name: '짝수 페이지 반복 양식 (Pattern A)',
        pages: evenPages,
        samplePageIndex: 0,
        samplePageNumber: 1,
      },
      {
        id: 'pat_auto_odd',
        name: '홀수 페이지 반복 양식 (Pattern B)',
        pages: oddPages,
        samplePageIndex: 1,
        samplePageNumber: 2,
      }
    );
  }

  return {
    patterns,
    totalPages: pagesTextData.length,
  };
}

/**
 * Replicate selected redaction bounding boxes from a sample page to all matching pages in a pattern cluster.
 */
export function replicateRedactionsToPatternPages(sourceRedactions, targetPageNumbers, pagesTextData) {
  const newRedactions = [];

  targetPageNumbers.forEach((pageNumber) => {
    const targetPageIndex = pageNumber - 1;

    sourceRedactions.forEach((srcRedaction) => {
      newRedactions.push({
        id: `pat_rep_${targetPageIndex}_${srcRedaction.id}_${Date.now()}`,
        pageIndex: targetPageIndex,
        pageNumber: pageNumber,
        type: PII_TYPES.PATTERN.key,
        typeName: PII_TYPES.PATTERN.name,
        typeColor: PII_TYPES.PATTERN.color,
        category: 'Pattern',
        detectedText: `[양식일괄] ${srcRedaction.detectedText || '패턴 마스킹'}`,
        fullItemText: srcRedaction.fullItemText || '',
        bounds: { ...srcRedaction.bounds },
        status: 'approved', // Auto-approved upon pattern replication
      });
    });
  });

  return newRedactions;
}
