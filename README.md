<img src="https://raw.githubusercontent.com/jinsh1210/omni-discord-bot/main/assets/app_icon.png" align="left" height="100" alt="Omni Bot Icon" />

# Omni
High-performance, modular Discord bot — music streaming, server management, and community tools in one ecosystem.

[![GitHub downloads](https://img.shields.io/github/downloads/jinsh1210/omni-discord-bot/total)](https://github.com/jinsh1210/omni-discord-bot/releases)
[![GitHub release](https://img.shields.io/github/v/release/jinsh1210/omni-discord-bot)](https://github.com/jinsh1210/omni-discord-bot/releases/latest)
[![License](https://img.shields.io/github/license/jinsh1210/omni-discord-bot)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Discord-5865F2)](https://github.com/jinsh1210/omni-discord-bot)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<br />

## 스크린샷

![Dashboard Screenshot](https://raw.githubusercontent.com/jinsh1210/omni-discord-bot/main/assets/dashboard.png)

## 기능

- **고음질 음악 스트리밍**: FFmpeg 파이프라인으로 YouTube 및 Apple Music 링크 재생. 배속 드리프트 방지(`-re` 플래그)와 TLS 재연결 허용(최대 10초 갭 허용)으로 끊김 없는 재생.
- **Apple Music 지원**: Apple Music 트랙·플레이리스트 URL을 iTunes API로 메타데이터 추출 후 YouTube에서 검색해 재생. 181곡 플레이리스트 기준 첫 곡 시작까지 ~1.3초.
- **반복 및 셔플**: 한 곡 반복 / 전체 반복 / 셔플 모드. 대기열 끝에서 자동 순환.
- **실시간 대시보드**: Firestore 연동 React 대시보드에서 길드별 기능 활성화, 음악 패널 상태를 실시간으로 확인·제어.
- **서버 관리 도구**: 시간 제한 닉네임 변경, 자동 삭제 임시 채널, 추방/차단/메시지 정리 명령어.
- **커뮤니티 기능**: 익명 메시지 채널(대나무숲), 관리자 승인 기반 역할 부여 버튼.

## 설치

### 요구 사항

- Node.js v18+
- FFmpeg (시스템 PATH 등록 필요)
- yt-dlp (시스템 PATH 등록 필요)
- Firebase 프로젝트 및 Discord 봇 토큰

### 설정

```sh
# 1. 저장소 복제 및 의존성 설치
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot
npm install

# 2. 환경 변수 설정
cp omni-bot/.env.example omni-bot/.env
cp omni-dashboard/.env.example omni-dashboard/.env
# 각 .env 파일에 토큰 및 Firebase 설정 입력

# 3. 실행
npm run dev
```

### Docker

```sh
cd omni-bot
docker build -t omni-bot .
docker run --env-file .env omni-bot
```

## 호환성

| 버전 | Node.js | 비고 |
|------|---------|------|
| v1.0.3 (현재) | v18+ | Apple Music 지원, 음악 반복/셔플 |
| v1.0.2 | v18+ | Docker FFmpeg 호환성 수정 |
| v1.0.1 | v18+ | ⚠️ 오디오 버그 있음, 사용 비권장 |

## Credits

- [discord.js](https://discord.js.org) — Discord API 클라이언트
- [@discordjs/voice](https://github.com/discordjs/voice) — 음성 채널 스트리밍 파이프라인
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube 메타데이터 추출 및 스트림 URL 획득
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — 정적 FFmpeg 바이너리 번들링
- [Firebase](https://firebase.google.com) — 실시간 Firestore DB 및 인증
- [Vite](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com) — 대시보드 빌드 시스템

## 라이선스

[MIT](LICENSE)
