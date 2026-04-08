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

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot
npm install
```

#### 2. Environment Configuration
Create `.env` files in both sub-directories based on `.env.example`.

**omni-bot/.env**:
```env
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
```

**omni-dashboard/.env**:
```env
VITE_FIREBASE_API_KEY=your_key
... (other firebase config)
```

#### 3. Running the Project
```bash
# Run both Bot and Dashboard concurrently
npm run dev
```

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

### 설치 및 실행 방법

#### 1. 저장소 복제 및 의존성 설치
```bash
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot
npm install
```

#### 2. 환경 변수 설정
각 폴더의 `.env.example`을 참고하여 `.env` 파일을 생성하세요.

#### 3. 프로젝트 실행
```bash
# 루트 폴더에서 봇과 대시보드를 동시에 실행
npm run dev
```

## Quality Assurance / 품질 보증
Omni follows ISTQB-aligned testing methodologies with **Vitest**.
Omni는 Vitest를 활용하여 ISTQB 표준을 준수하는 엄격한 자동화 테스트를 수행합니다.

## License
MIT License
