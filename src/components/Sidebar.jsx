import React, { useState } from 'react';
import { Search, CheckSquare, Square, EyeOff, Layers, Trash2, ShieldCheck, Sparkles, Filter, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';

export default function Sidebar({
  detections,
  patterns,
  ignoredTerms,
  currentPage,
  onSelectDetection,
  onToggleDetectionStatus,
  onToggleAllDetections,
  onIgnoreTerm,
  onRemoveIgnoreTerm,
  onApplyPatternMasking,
  onJumpToPage,
}) {
  const [activeTab, setActiveTab] = useState('detections'); // detections, patterns, exceptions
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter detections based on search & filterType
  const filteredDetections = detections.filter((item) => {
    if (filterType !== 'ALL' && item.type !== filterType && item.category !== filterType) return false;
    if (searchQuery && !item.detectedText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingCount = detections.filter((d) => d.status === 'approved').length;

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] select-none z-20">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1">
        {[
          { id: 'detections', label: '탐지 목록', icon: ShieldCheck, badge: detections.length },
          { id: 'patterns', label: '양식 패턴', icon: Layers, badge: patterns.length },
          { id: 'exceptions', label: '예외 관리', icon: EyeOff, badge: ignoredTerms.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DETECTIONS LIST */}
      {activeTab === 'detections' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Controls Header */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900/40">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="탐지 항목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Bulk Action */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <button
                onClick={() => onToggleAllDetections(true)}
                className="hover:text-indigo-400 font-medium transition flex items-center space-x-1"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>전체 승인</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => onToggleAllDetections(false)}
                className="hover:text-rose-400 font-medium transition flex items-center space-x-1"
              >
                <Square className="w-3.5 h-3.5" />
                <span>전체 해제</span>
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] font-mono text-emerald-400">{pendingCount}개 활성</span>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {filteredDetections.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                탐지된 개인정보가 없습니다.
                <br />
                PDF를 로드하거나 설정에서 AI 엔진을 실행해보세요.
              </div>
            ) : (
              filteredDetections.map((item) => {
                const isApproved = item.status === 'approved';
                const isCurrentPage = item.pageNumber === currentPage;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition cursor-pointer group ${
                      isCurrentPage
                        ? 'border-indigo-500/50 bg-indigo-500/5 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                    onClick={() => {
                      onJumpToPage(item.pageNumber);
                      onSelectDetection(item);
                    }}
                  >
                    {/* Item Top Meta */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        {/* Status Checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDetectionStatus(item.id);
                          }}
                          className="text-slate-400 hover:text-white transition"
                        >
                          {isApproved ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>

                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: item.typeColor || '#6366f1' }}
                        >
                          {item.typeName}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        P.{item.pageNumber}
                      </span>
                    </div>

                    {/* Detected Content */}
                    <div className="text-xs font-semibold text-slate-200 truncate pl-6 mb-2" title={item.detectedText}>
                      {item.detectedText}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end space-x-2 border-t border-slate-800/80 pt-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onIgnoreTerm(item.detectedText);
                        }}
                        className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition"
                        title="이 단어를 모든 페이지에서 예외(무시) 처리합니다."
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>전체 무시</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAGE PATTERN CLUSTERS */}
      {activeTab === 'patterns' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-xs text-indigo-300">
            💡 반복되는 양식 구조를 감지했습니다. 마스터 페이지에서 검수한 마스킹 영역을 동일 서식 전체 페이지에 일괄 적용할 수 있습니다.
          </div>

          {patterns.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">탐지된 반복 양식 패턴이 없습니다.</div>
          ) : (
            patterns.map((pat) => (
              <div key={pat.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {pat.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold">
                    {pat.pages.length}개 페이지
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  해당 양식 포함 페이지: <span className="font-mono text-slate-300">P.{pat.pages.join(', P.')}</span>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => onJumpToPage(pat.samplePageNumber)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    대표 P.{pat.samplePageNumber} 검수하기
                  </button>
                  <button
                    onClick={() => onApplyPatternMasking(pat)}
                    className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    양식 전체 반영
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: EXCEPTIONS & IGNORED TERMS */}
      {activeTab === 'exceptions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          <div className="text-xs text-slate-400 mb-2">무시(예외)로 지정되어 자동 탐지에서 제외된 단어 목록입니다.</div>

          {ignoredTerms.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">예외 지정된 단어가 없습니다.</div>
          ) : (
            ignoredTerms.map((term, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="font-mono text-slate-200 truncate max-w-[180px]">{term}</span>
                <button
                  onClick={() => onRemoveIgnoreTerm(term)}
                  className="text-slate-400 hover:text-rose-400 transition p-1"
                  title="예외 규칙 삭제 (다시 탐지)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
