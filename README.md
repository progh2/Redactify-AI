# 🖥️ Redactify AI - Desktop PDF PII Redactor

> **크로스플랫폼(Windows, macOS, Linux) AI 기반 PDF 개인정보 탐지 및 양식 패턴 일괄 비식별화(Redaction) Desktop GUI 애플리케이션**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-34.0-47848F.svg)
![React](https://img.shields.io/badge/React-19.0-61dafb.svg)
![Ollama](https://img.shields.io/badge/Ollama-Supported-black.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## 📸 데스크톱 애플리케이션 스크린샷 (Screenshots & Feature Demo)

### 1. 🖥️ 메인 데스크톱 GUI 화면 (Main Desktop GUI Interface)
> PDF 문서를 렌더링하고 좌측 패널에서 정규식 & AI 기반 개인정보(주민번호, 전화번호, 이름, 주소 등) 탐지 결과를 시각적으로 확인 및 검수합니다.

![Main Desktop App GUI](./docs/screenshots/desktop_app_main.jpg)

---

### 2. ⚡ 반복 서식 양식 패턴 일괄 마스킹 (Pattern Batch Redaction Test)
> 수십~수백 페이지의 반복 서식 문서를 자동 분석하여 대표 페이지의 마스킹 영역을 동일 서식 전체 페이지에 1-Click 일괄 적용합니다.

![Pattern Batch Redaction Test](./docs/screenshots/pattern_batch_redaction.jpg)

---

### 3. 🦙 로컬 LLM (Ollama) & Cloud AI 설정 (AI Settings Modal)
> 외부 송신 없는 100% 온디바이스 로컬 Ollama (`llama3`, `qwen2.5` 등) 연결 또는 Anthropic Claude, OpenAI ChatGPT API Key 설정 모달입니다.

![AI Settings Modal](./docs/screenshots/llm_settings_modal.jpg)

---

## 📌 주요 핵심 기능 (Key Features)

### 1. 🛡️ 완벽한 보안 비식별화 (True Redaction Engine)
- 단순 사각형 덮어쓰기가 아닌, `pdf-lib` 객체 렌더링 삭제 파이프라인을 통해 **PDF 내부 텍스트/이미지 스트림 및 메타데이터(작성자, 제목)를 완벽하게 영구 삭제**하여 드래그/복사/추출을 근본적으로 차단합니다.

### 2. 🦙 프라이버시 최우선 로컬 LLM & Cloud API 연동
- **Ollama (로컬 LLM)**: 외부 네트워크 송신 없는 **100% 온디바이스(로컬)** 개인정보 분석.
- **Cloud AI (선택)**: Anthropic Claude (Claude 3.5 Sonnet), OpenAI ChatGPT (GPT-4o-mini) API Key 연동 지원.
- **⚡ 정규식 전용 탐지**: 주민등록번호, 외국인번호, 전화번호, 이메일, 계좌번호, 여권번호, 사업자등록번호, 운전면허번호 고속 1차 필터링.

### 3. 📑 반복 양식 서식 패턴 분석 (Batch Layout Clustering)
- 수십~수백 페이지의 반복 서식(계약서, 신청서 등)을 자동으로 분석하여 **양식 패턴(Pattern A, Pattern B...)**으로 분류합니다.
- 대표 페이지에서 마스킹 박스를 검수한 후 **[양식 전체 반영]** 버튼 클릭 한 번으로 모든 동일 양식 페이지에 마스킹을 일괄 적용합니다.

### 4. 🎯 대화형 검수 & 예외(무시) 관리자
- **시각적 Canvas 뷰어**: 오버레이 하이라이트로 탐지 위치 표시 (줌 50%~200%, 페이지 이동).
- **전체 무시 (Ignore)**: 오탐 단어 클릭 시 문서 전체에서 해당 항목 예외 처리.
- **수동 영역 지정 (Custom Redaction)**: 마스킹 툴바에서 마우스 드래그로 원하는 위치에 자유롭게 커스텀 마스킹 영역 지정.

### 5. 🧪 1-Click 샘플 PDF 자동 생성기
- 테스트용 PDF가 없어도 메인 화면에서 `[🧪 샘플 PDF 생성]` 버튼을 누르면 한국어 PII 서식이 포함된 4페이지 분량의 테스트 PDF가 즉시 생성됩니다.

---

## 🏗️ 기술 스택 (Tech Stack)

| 구분 | 기술 스택 |
| :--- | :--- |
| **Desktop Shell** | **Electron 34** (Windows, macOS, Linux Native GUI) |
| **Frontend Framework** | React 19, Vite 8 |
| **PDF Core Engine** | `pdfjs-dist` (렌더링 & 좌표 추출), `pdf-lib` (True Redaction) |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons, Canvas Confetti |
| **AI / LLM API** | Ollama Client API (REST), Anthropic Messages API, OpenAI Chat API |

---

## 📄 제품 요구사항 정의서 (PRD)

상세 기술 사양 및 요구사항은 [PRD.md](./PRD.md) 파일에서 확인하실 수 있습니다.

---

## 🚀 데스크톱 앱 실행 및 배포 패키징 (Desktop App Build & Run)

### 사전 요구 사항 (Prerequisites)
- **Node.js**: v18.0.0 이상
- **npm**: v9.0.0 이상
- **Ollama (선택 - 로컬 AI 사용 시)**: [https://ollama.com](https://ollama.com) 설치 후 `ollama run llama3` 실행

### 1. 데스크톱 앱 개발 모드 실행 (Desktop GUI Run)

```bash
# 1. 의존성 패키지 설치
npm install

# 2. Electron 데스크톱 GUI 앱 실행
npm run electron
```

### 2. 운영체제별 단일 실행파일 배포 빌드 (Packaging Executables)

```bash
# Windows / macOS / Linux 실행 파일 (.exe, .dmg, .AppImage) 패키징
npm run dist
```
빌드 완료 후 `release/` 폴더에 설치 없이 바로 실행 가능한 포터블 데스크톱 바이너리가 생성됩니다.

---

## 📜 라이선스 (License)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
