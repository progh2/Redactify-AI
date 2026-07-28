import React, { useState } from 'react';
import { MessageSquareText, Send, Sparkles, Bot, User, CornerDownRight, FileText, Loader2, ArrowRight } from 'lucide-react';
import { askRAGQuestion } from '../utils/ragEngine';

export default function RAGAssistantTab({ ragChunks, config, onJumpToPage }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: '안녕하세요! 업로드하신 PDF 문서에 대해 질문해주세요. AI가 문서를 직접 RAG 벡터 검색하여 정확한 답변과 관련 페이지를 찾아드립니다.',
      referencedPages: [],
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const suggestedPrompts = [
    '이 문서의 핵심 내용과 개인정보 포함 현황 요약해줘',
    '문서에서 주민등록번호, 계좌번호 등 고위험 PII 항목 위치는?',
    '문서에 등장하는 성명(이름)과 소속 정보 알려줘',
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isAsking) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsAsking(true);

    try {
      const ragResult = await askRAGQuestion(textToSend, ragChunks, config);

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: ragResult.answer,
        referencedPages: ragResult.referencedPages,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: `오류가 발생했습니다: ${err.message || 'AI 답변 생성 실패'}. 설정에서 AI 엔지나 API Key를 확인해주세요.`,
          referencedPages: [],
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Bot className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
            AI RAG 질의응답 (Q&A)
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              {config.provider.toUpperCase()}
            </span>
          </h3>
          <p className="text-[10px] text-slate-400">문서 문맥을 RAG로 학습/검색하여 답변합니다.</p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
              {msg.sender === 'ai' ? (
                <>
                  <Bot className="w-3 h-3 text-indigo-400" />
                  <span className="font-semibold text-slate-300">RAG AI Assistant</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-300">사용자</span>
                  <User className="w-3 h-3 text-emerald-400" />
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-none whitespace-pre-wrap'
              }`}
            >
              {msg.text}

              {/* Page References Clickable Chips */}
              {msg.referencedPages && msg.referencedPages.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">참고 페이지:</span>
                  {msg.referencedPages.map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => onJumpToPage(pNum)}
                      className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] flex items-center space-x-1 transition"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>P.{pNum} 이동</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>RAG 벡터 DB 문맥 탐색 및 AI 답변 생성 중...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>추천 질의버튼</span>
        </div>
        <div className="flex flex-col gap-1">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isAsking}
              className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition flex items-center justify-between group disabled:opacity-50"
            >
              <span className="truncate">{prompt}</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2">
        <input
          type="text"
          placeholder="문서 내용에 대해 질문하세요..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isAsking}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isAsking}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/20 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
