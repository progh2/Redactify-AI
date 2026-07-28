import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, MousePointer, SquarePlus, Check, Trash2 } from 'lucide-react';
import { renderPdfPage } from '../utils/pdfEngine';
import { PII_TYPES } from '../utils/piiDetector';

export default function PDFCanvasViewer({
  pdfDoc,
  currentPage,
  pageCount,
  onPageChange,
  detections,
  onToggleDetectionStatus,
  onAddManualRedaction,
  onRemoveDetection,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [scale, setScale] = useState(1.4);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);

  // Render current PDF Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;
    renderPdfPage(pdfDoc, currentPage, canvasRef.current, scale).then((info) => {
      if (isMounted) {
        setPageSize({ width: info.width, height: info.height });
        setViewport(info.viewport);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage, scale]);

  // Filter detections belonging to current page
  const pageDetections = detections.filter((d) => d.pageNumber === currentPage);

  // Mouse Handlers for Custom Manual Redaction Box Drawing
  const handleMouseDown = (e) => {
    if (!isManualMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return;

    setIsDrawing(false);

    const left = Math.min(drawStart.x, drawCurrent.x);
    const top = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawStart.x - drawCurrent.x);
    const height = Math.abs(drawStart.y - drawCurrent.y);

    // Only create box if larger than 10x10 px
    if (width > 10 && height > 10) {
      // Convert Canvas pixel coords to PDF point coords (1.0 scale)
      const pdfX = left / scale;
      const pdfY = top / scale; // PDF Y from top
      const pdfW = width / scale;
      const pdfH = height / scale;

      onAddManualRedaction({
        pageNumber: currentPage,
        pageIndex: currentPage - 1,
        type: PII_TYPES.MANUAL.key,
        typeName: PII_TYPES.MANUAL.name,
        typeColor: PII_TYPES.MANUAL.color,
        category: 'Manual',
        detectedText: '[사용자 지정 마스킹 영역]',
        bounds: {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          pdfY: pageSize.height / scale - pdfY - pdfH,
        },
      });
    }

    setDrawStart(null);
    setDrawCurrent(null);
  };

  return (
    <main className="flex-1 bg-slate-950 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden select-none">
      {/* Top Floating Toolbar */}
      <div className="h-12 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur px-6 flex items-center justify-between z-10">
        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-300 font-mono">
            <span className="font-bold text-white">{currentPage}</span> / {pageCount || 1}
          </span>

          <button
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Manual Mode & Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isManualMode
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isManualMode ? <SquarePlus className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
            <span>{isManualMode ? '마우스 영역 지정 중' : '수동 영역 추가'}</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-300 font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll View */}
      <div ref={containerRef} className="flex-1 overflow-auto p-8 flex justify-center items-start custom-scrollbar">
        <div
          className="relative shadow-2xl bg-white rounded border border-slate-700 overflow-hidden"
          style={{ width: pageSize.width, height: pageSize.height }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Main PDF Page Render Canvas */}
          <canvas ref={canvasRef} className="block pointer-events-none" />

          {/* Detections Overlays Layer */}
          {pageDetections.map((det) => {
            const { x, y, width, height } = det.bounds;
            const canvasX = x * scale;
            const canvasY = y * scale;
            const canvasW = width * scale;
            const canvasH = height * scale;

            const isApproved = det.status === 'approved';

            return (
              <div
                key={det.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDetectionStatus(det.id);
                }}
                className={`absolute group cursor-pointer transition-all duration-150 rounded-xs border-2 flex items-center justify-center ${
                  isApproved
                    ? 'bg-black/90 border-rose-500 shadow-md'
                    : 'bg-amber-400/20 border-amber-400 border-dashed hover:bg-amber-400/40'
                }`}
                style={{
                  left: canvasX,
                  top: canvasY,
                  width: Math.max(16, canvasW),
                  height: Math.max(16, canvasH),
                }}
                title={`${det.typeName}: ${det.detectedText} (클릭하여 마스킹 토글)`}
              >
                {/* Visual Label inside or on Hover */}
                {isApproved && (
                  <span className="text-[9px] font-bold text-white uppercase tracking-tighter truncate px-1">
                    REDACTED
                  </span>
                )}

                {/* Tooltip Hover Overlay */}
                <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1 rounded text-[10px] whitespace-nowrap shadow-lg border border-slate-700 z-30 items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: det.typeColor || '#ef4444' }}></span>
                  <span className="font-semibold">{det.typeName}:</span>
                  <span className="font-mono text-slate-300">{det.detectedText}</span>
                </div>
              </div>
            );
          })}

          {/* Active Drawing Box Overlay */}
          {isDrawing && drawStart && drawCurrent && (
            <div
              className="absolute border-2 border-emerald-500 bg-emerald-500/30 rounded-xs pointer-events-none"
              style={{
                left: Math.min(drawStart.x, drawCurrent.x),
                top: Math.min(drawStart.y, drawCurrent.y),
                width: Math.abs(drawStart.x - drawCurrent.x),
                height: Math.abs(drawStart.y - drawCurrent.y),
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
