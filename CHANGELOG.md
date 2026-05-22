# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-05-23

### Added
- Apple Music track and playlist URL playback via iTunes API + YouTube search.
- Parallel batch playlist loading (5 tracks at a time), first song starts in ~1.3s.
- Streaming batch callback — first batch enqueued immediately while rest loads in background.

### Fixed
- Added `-reconnect_on_network_error 1` FFmpeg flag to handle `Connection reset by peer` without track skip.
- Raised `maxMissedFrames` to 750 (15s) to prevent Idle transition during TLS reconnect.
- Suppressed FFmpeg Broken pipe error logs (exit code 1 is normal termination).
- Network/search timeout hardening (execFile 15s, HTML fetch 20s + 3s retry).
- Fixed playlist track duplication caused by race condition in `enqueueMultiple`.

### Docs
- Redesigned README in MonitorControl style (icon, badges, screenshot, compatibility table, credits).

## [1.0.3] - 2026-04-10

### Added
- Music repeat (Off → Single → All) and shuffle features.
- Bilingual (KR/EN) MIT License and setup instructions.

### Removed
- Reverted experimental setup wizard for stability.

## [1.0.2] - 2026-04-08

### Added
- `.dockerignore` for container optimization.
- Enhanced FFmpeg debugging logs.

### Fixed
- Docker FFmpeg compatibility.
- Stream early-termination bug.

## [1.0.1] - 2026-04-08 — YANKED (audio bug)

> Do not use. Upgrade to v1.0.2 or later.

### Added
- Vitest-based automated testing (ISTQB-aligned).
- AI agent development harness.

## [1.0.0] - 2026-04-08

- Initial release.
