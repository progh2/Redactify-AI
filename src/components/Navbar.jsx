import React from 'react';
import { ShieldAlert, FileUp, Settings, Download, Sparkles, CheckCircle2, FileCheck, Layers } from 'lucide-react';

export default function Navbar({
  fileName,
  pageCount,
  approvedCount,
  onFileSelect,
  onGenerateSample,
  onOpenSettings,
  onSavePdf,
  isProcessing,
  providerInfo,
}) {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6 select-none shadow-md z-30">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              PDF PII Redactor AI
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
              v1.0 Pro
            </span>
          </div>
          <p className="text-xs text-slate-400">개인정보 자동 분석 & 패턴 일괄 비식별화</p>
        </div>
      </div>

      {/* Loaded File Meta */}
      {fileName && (
        <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/60">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-200 truncate max-w-xs">{fileName}</span>
          <span className="text-xs text-slate-400">({pageCount} 페이지)</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* Sample PDF Loader */}
        <button
          onClick={onGenerateSample}
          disabled={isProcessing}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition disabled:opacity-50"
          title="테스트용 샘플 PDF 자동 생성"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">샘플 PDF 생성</span>
        </button>

        {/* File Upload */}
        <label className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/20 transition">
          <FileUp className="w-4 h-4" />
          <span>PDF 파일 열기</span>
          <input type="file" accept=".pdf" onChange={onFileSelect} className="hidden" />
        </label>

        {/* Settings Dialog */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition relative"
          title="LLM & 탐지 설정"
        >
          <Settings className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        {/* Save PDF */}
        <button
          onClick={onSavePdf}
          disabled={!fileName || approvedCount === 0 || isProcessing}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>비식별 PDF 저장</span>
          {approvedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-mono">
              {approvedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
