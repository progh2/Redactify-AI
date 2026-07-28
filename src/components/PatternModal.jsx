import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function PatternModal({ isOpen, onClose, pattern, onConfirm }) {
  if (!isOpen || !pattern) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">양식 패턴 전체 일괄 적용</h3>
              <p className="text-xs text-slate-400">{pattern.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-300 leading-relaxed">
            대표 페이지 <span className="font-bold text-white">P.{pattern.samplePageNumber}</span>에서 검수된 마스킹 위치를 동일한 양식 구조를 가진 아래 전체 페이지에 복제 일괄 적용합니다.
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400">일괄 마스킹 대상 페이지 목록:</div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-1.5 font-mono text-xs text-indigo-300 max-h-32 overflow-y-auto">
              {pattern.pages.map((pNum) => (
                <span key={pNum} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px]">
                  P.{pNum}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            취소
          </button>
          <button
            onClick={() => {
              onConfirm(pattern);
              onClose();
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>양식 전체 마스킹 반영</span>
          </button>
        </div>
      </div>
    </div>
  );
}
