## [v1.1.0] - 2026-05-22

### Features
- feat: Apple Music 링크로 노래 재생 지원

### Bug Fixes
- fix: 테스트 버그 수정 및 오디오 안정성 강화
- fix: 네트워크/검색 타임아웃 및 에러 방어 강화
- fix: 플레이리스트 백그라운드 배치 추가 시 트랙 누락 문제 수정
- fix: Broken pipe FFmpeg 에러 로그 억제
- fix: resolve intermittent track skip caused by TLS reconnect timeout

### Documentation
- docs: 앱 아이콘 및 대시보드 스크린샷 추가
- docs: README를 MonitorControl 스타일로 전면 개편

# Changelog

All notable changes to this project will be documented in this file.
본 문서에는 프로젝트의 모든 주요 변경 사항이 기록됩니다.

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
