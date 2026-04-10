# Omni - Professional Discord Bot Ecosystem

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## English

Omni is a high-performance, modular Discord solution featuring a real-time Firestore-backed React dashboard and automated QA infrastructure.

### Project Architecture
- **omni-bot**: TypeScript-based Discord bot utilizing `discord.js`.
- **omni-dashboard**: React-based management interface built with `Vite` and `Tailwind CSS`.

### Key Features
- **High-Fidelity Music**: Optimized streaming via FFmpeg with speed drift protection.
- **Server Utilities**: Temporary channels, time-limited nicknames, and automated moderation.
- **Community Engagement**: Anonymous messaging (Bamboo Forest) and approval-based role management.

### Prerequisites
- Node.js (v18+)
- FFmpeg & yt-dlp (System PATH required)
- Firebase Project & Discord Bot Token

### 🚀 One-Click Setup

No need to edit code or environment variables manually. Run the following command to set up everything automatically:

```bash
# 1. Clone the Repository
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot

# 2. Run the Wizard & Auto Deploy
npm run setup-all
```

#### Wizard Steps:
1. A browser window will open automatically. Enter your **Discord Bot Token**, **Client ID**, and **Firebase Config JSON**.
2. Click 'Save and Deploy'. The terminal will then handle **Docker building** and **Firebase hosting deployment**.

---

<a name="한국어"></a>
## 한국어

Omni는 실시간 Firestore 연동 React 대시보드와 자동화된 QA 인프라를 갖춘 고성능 모듈형 디스코드 봇 솔루션입니다.

### 프로젝트 아키텍처
- **omni-bot**: `discord.js` 기반의 TypeScript 디스코드 봇.
- **omni-dashboard**: `Vite`와 `Tailwind CSS`로 구축된 현대적인 React 관리 인터페이스.

### 주요 기능
- **고음질 음악 스트리밍**: FFmpeg 최적화 및 배속 방지 로직이 적용된 안정적인 재생.
- **서버 관리 도구**: 자동 삭제 임시 채널, 기간제 닉네임 변경 및 강화된 보안 명령행.
- **커뮤니티 활성화**: 익명 소통방(대나무숲) 및 관리자 승인 기반 역할 부여 시스템.

### 요구 사항
- Node.js (v18 이상)
- FFmpeg 및 yt-dlp (시스템 환경 변수 등록 필요)
- Firebase 프로젝트 및 디스코드 봇 토큰

### 🚀 원클릭 설치 및 실행 (One-Click Setup)

환경 변수를 직접 편집할 필요 없이, 아래 명령어로 모든 설정을 한 번에 마칠 수 있습니다.

```bash
# 1. 저장소 복제
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot

# 2. 마법사 실행 및 자동 배포
npm run setup-all
```

#### 설치 단계:
1. 브라우저가 자동으로 열리면 **Discord 봇 토큰**, **클라이언트 ID**, **Firebase 설정 JSON**을 입력합니다.
2. '저장 및 배포 시작' 버튼을 누르면 터미널에서 자동으로 **도커 빌드**와 **파이어베이스 배포**가 진행됩니다.

---

## Quality Assurance / 품질 보증
Omni follows ISTQB-aligned testing methodologies with **Vitest**.
Omni는 Vitest를 활용하여 ISTQB 표준을 준수하는 엄격한 자동화 테스트를 수행합니다.

## License
MIT License
