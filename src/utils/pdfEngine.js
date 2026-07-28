import * as pdfjsLib from 'pdfjs-dist';

// Use UNPKG CDN or cdnjs worker for browser compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

/**
 * Load PDF Document from File or ArrayBuffer
 */
export async function loadPdfDocument(fileOrArrayBuffer) {
  let buffer;
  if (fileOrArrayBuffer instanceof File) {
    buffer = await fileOrArrayBuffer.arrayBuffer();
  } else if (fileOrArrayBuffer instanceof ArrayBuffer) {
    buffer = fileOrArrayBuffer;
  } else if (fileOrArrayBuffer instanceof Uint8Array) {
    buffer = fileOrArrayBuffer.buffer;
  } else {
    throw new Error('Unsupported PDF data source');
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  return { pdfDoc, originalBuffer: buffer };
}

/**
 * Render a single PDF page onto a canvas
 */
export async function renderPdfPage(pdfDoc, pageNumber, canvas, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  return { viewport, width: viewport.width, height: viewport.height };
}

/**
 * Extract all text items from a PDF page with exact bounding box coordinates
 */
export async function extractPageTextItems(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 }); // 1.0 scale for PDF point coords
  const textContent = await page.getTextContent();

  const textItems = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i];
    if (!item.str || item.str.trim() === '') continue;

    // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const tx = item.transform;
    const x = tx[4];
    const y = tx[5];
    const width = item.width || 10;
    const height = item.height || Math.abs(tx[3]) || 12;

    // PDF Y-axis is inverted (0,0 is bottom-left). Convert to top-left origin:
    const pdfHeight = viewport.height;
    const topY = pdfHeight - y - height;

    textItems.push({
      id: `p${pageNumber}_t${i}`,
      pageIndex: pageNumber - 1, // 0-indexed
      pageNumber: pageNumber,
      text: item.str,
      x: x,
      y: topY,
      width: width,
      height: height,
      pdfY: y, // original PDF Y
      pdfHeight: pdfHeight,
      transform: tx,
    });
  }

  return {
    pageNumber,
    pageIndex: pageNumber - 1,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    items: textItems,
  };
}
