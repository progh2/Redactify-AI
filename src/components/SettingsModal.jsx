import React, { useState } from 'react';
import { X, Server, Key, Cpu, Check, AlertCircle, RefreshCw, Lock } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, config, onSaveConfig }) {
  if (!isOpen) return null;

  const [provider, setProvider] = useState(config.provider || 'ollama');
  const [ollamaUrl, setOllamaUrl] = useState(config.ollamaUrl || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(config.ollamaModel || 'llama3');
  const [claudeKey, setClaudeKey] = useState(config.claudeKey || '');
  const [openaiKey, setOpenaiKey] = useState(config.openaiKey || '');
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('로컬 Ollama 서버 연결 확인 중...');

    try {
      if (provider === 'ollama') {
        const res = await fetch(`${ollamaUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          const models = data.models ? data.models.map((m) => m.name) : [];
          setTestStatus('success');
          setTestMessage(`연결 성공! 사용 가능한 모델: ${models.join(', ') || '없음'}`);
        } else {
          throw new Error(`HTTP Error ${res.status}`);
        }
      } else {
        setTestStatus('success');
        setTestMessage('API Key가 입력되었습니다.');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`연결 실패: ${err.message || '서버 응답 없음'}. Ollama가 실행 중인지 확인하세요.`);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      provider,
      ollamaUrl,
      ollamaModel,
      claudeKey,
      openaiKey,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">AI 및 LLM 탐지 설정</h3>
              <p className="text-xs text-slate-400">개인정보 분석에 사용할 AI 엔진 및 API 키를 설정합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              AI 엔진 공급자 선택
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'ollama', name: 'Ollama (로컬)', icon: '🦙', sub: '프라이버시 최우선' },
                { id: 'claude', name: 'Claude (Cloud)', icon: '🤖', sub: 'Anthropic' },
                { id: 'openai', name: 'OpenAI (Cloud)', icon: '🟢', sub: 'ChatGPT' },
                { id: 'regex', name: 'Regex 전용', icon: '⚡', sub: 'AI 미사용' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setProvider(tab.id);
                    setTestStatus(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    provider === tab.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl mb-1">{tab.icon}</span>
                  <div>
                    <div className="text-xs font-bold">{tab.name}</div>
                    <div className="text-[10px] opacity-70">{tab.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Details */}
          {provider === 'ollama' && (
            <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> 로컬 온디바이스 Ollama 설정 (외부 유출 없음)
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Ollama 서버 URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">모델 이름</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3, qwen2.5, mistral, deepseek-r1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {provider === 'claude' && (
            <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs text-slate-300">Anthropic Claude API Key</label>
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">Claude 3.5 Sonnet 모델을 이용해 이름 및 문맥 개인정보를 분석합니다.</p>
            </div>
          )}

          {provider === 'openai' && (
            <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <label className="block text-xs text-slate-300">OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">GPT-4o-mini 모델을 이용해 정밀한 개인정보 식별을 수행합니다.</p>
            </div>
          )}

          {provider === 'regex' && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-300">
              ⚡ 정규식(Regex) 탐지만 사용합니다. 주민등록번호, 전화번호, 이메일, 계좌번호 등 고정 패턴만 빠르게 검색합니다.
            </div>
          )}

          {/* Connection Test Status */}
          {testStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                testStatus === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : testStatus === 'error'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {testStatus === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
              {testStatus === 'testing' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-indigo-400" />}
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleTestConnection}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Server className="w-3.5 h-3.5" />
            <span>연결 테스트</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
