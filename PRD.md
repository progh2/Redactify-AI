# [PRD] AI 기반 크로스플랫폼 PDF 개인정보 탐지, RAG Q&A 및 비식별화(Redaction) GUI 프로그램

> **문서 버전:** v1.1  
> **작성일:** 2026-07-28  
> **상태:** 완료 및 RAG Q&A 기능 통합 (Implemented)  

---

## 1. 개요 및 목적 (Overview & Goals)

본 제품은 PDF 문서 내 포함된 주민등록번호, 전화번호, 주소, 계좌번호, 성명 등 **개인식별정보(PII)**를 자동으로 탐지하고, 사용자가 검수 및 수정을 거쳐 **완벽하게 영구 비식별화(내용 삭제 및 검은색 마스킹 박스 처리)**할 수 있는 크로스플랫폼 데스크톱 GUI 애플리케이션입니다.

또한 **RAG (Retrieval-Augmented Generation) 문서 검색 색인**을 내장하여 업로드된 PDF 문서를 바탕으로 사용자가 자유롭게 질문하고 AI(로컬 Ollama / Claude / ChatGPT)가 문맥을 탐색해 정확한 답변 및 참고 페이지 좌표를 제공합니다.

---

## 2. 주요 기능 사양 (Key Functional Specs)

### 2.1. RAG (Retrieval-Augmented Generation) AI 문서 질의응답 (Q&A)
- **문서 베이스 RAG 색인 구축**: PDF 텍스트 추출 시 페이지별/단락별 텍스트 청크(Chunk) 및 좌표 벡터 색인을 자동 생성.
- **문맥 기반 AI 답변 생성**: 사용자 질문 입력 시 가장 연관성 높은 텍스트 청크를 검색(Retrieval)하여 프롬프트로 AI에 전달.
- **참고 페이지 인터랙티브 칩 (`[P.1]`, `[P.3]`)**: 답변 내 인용된 페이지 칩 클릭 시 뷰어가 해당 페이지로 즉시 이동.

### 2.2. 멀티 LLM & AI 연동 파이프라인
- **로컬 LLM (Ollama)**: REST API (`http://localhost:11434`) 100% 온디바이스 탐지 및 RAG 답변.
- **Cloud AI**: Anthropic Claude 3.5 Sonnet, OpenAI ChatGPT GPT-4o-mini 지원.

### 2.3. 반복 서식 양식 패턴 분석 (Batch Pattern Redaction)
- 수십~수백 페이지의 반복 서식을 자동 감지 및 클러스터링. 대표 페이지 검수 후 1-Click 전체 일괄 반영.

### 2.4. 진정한 비식별화 (True Redaction Engine)
- `pdf-lib` 기반 PDF 스트림 객체 렌더링 삭제 및 문서 메타데이터 정화.
