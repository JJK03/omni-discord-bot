## [v1.1.1] - 2026-05-22

### Documentation
- docs: v1.1.0 CHANGELOG 상세 내역으로 정리

# Changelog

All notable changes to this project will be documented in this file.
본 문서에는 프로젝트의 모든 주요 변경 사항이 기록됩니다.

## [1.1.0] - 2026-05-23
### Added / 추가
- Apple Music track and playlist URL playback support via iTunes API + YouTube search / iTunes API와 YouTube 검색을 통한 Apple Music 트랙·플레이리스트 URL 재생 지원.
- Parallel batch loading for playlists (5 tracks at a time), first track starts in ~1.3s / 플레이리스트 병렬 배치 로드 (5곡씩), 첫 곡 시작 ~1.3초.
- Streaming batch callback — first batch enqueued immediately while rest loads in background / 스트리밍 배치 콜백으로 첫 배치 즉시 큐 등록, 나머지 백그라운드 로드.

### Fixed / 수정
- Suppressed FFmpeg Broken pipe error logs (exit code 1 treated as normal termination) / FFmpeg Broken pipe 에러 로그 억제 (exit code 1 정상 종료 처리).
- Strengthened TLS reconnect tolerance (`maxMissedFrames` 500, `reconnect_delay_max` 10s) / TLS 재연결 허용 강화.
- Network/search timeout and error defense (execFile 15s, HTML fetch 20s + 3s retry) / 네트워크·검색 타임아웃 및 에러 방어 강화.
- Fixed playlist track duplication bug caused by race condition in `enqueueMultiple` / `enqueueMultiple` 경쟁 조건으로 인한 트랙 중복 재생 버그 수정.

### Docs / 문서
- Redesigned README in MonitorControl style (icon, badges, screenshot, compatibility table, Credits) / README를 MonitorControl 스타일로 전면 개편.

## [1.0.3] - 2026-04-10
### Added / 추가
- Added music repeat (Off -> Single -> All) and shuffle features / 음악 반복 및 셔플 기능 추가.
- Added bilingual (KR/EN) MIT License and professional setup instructions / 한글/영문 MIT 라이선스 및 전문 설치 가이드 추가.
- Implemented codebase-wide professional bilingual documentation / 코드베이스 전반에 걸쳐 전문적인 한글/영문 주석 및 문서화 적용.
- Enhanced development harness with stricter release and testing workflows / 강화된 개발 하네스 및 배포/테스트 워크플로우 적용.

### Removed / 삭제
- Reverted experimental setup wizard for stability / 안정성을 위해 실험적 설정 마법사 기능 롤백.

## [1.0.2] - 2026-04-08
### Added / 추가
- Added .dockerignore for container optimization / 컨테이너 최적화를 위한 .dockerignore 추가.
- Enhanced FFmpeg debugging logs / FFmpeg 디버깅 로그 강화.

### Fixed / 수정
- Resolved Docker FFmpeg compatibility / 도커 FFmpeg 호환성 문제 해결.
- Fixed stream termination issues / 스트림 조기 종료 버그 수정.

## [1.0.1] - 2026-04-08 [YANKED - AUDIO BUG]
> **Warning**: This version has critical audio bugs. v1.0.2 이상을 사용하세요.

### Added / 추가
- Automated testing with Vitest / Vitest 기반 자동화 테스트 도입.
- ISTQB-aligned test suites / ISTQB 표준 준수 테스트 스위트.
- AI Agent Development Harness / AI 에이전트 협업 가이드라인.

## [1.0.0] - 2026-04-08 [DEPRECATED]
- Initial release / 초기 릴리즈 버전.
