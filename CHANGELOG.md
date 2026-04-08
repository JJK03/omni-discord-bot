# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-04-08
### Added
- Added `.dockerignore` to prevent local `node_modules` and sensitive files from being copied into containers.
- Enhanced FFmpeg debugging with detailed exit code and stderr logging in Docker logs.

### Changed
- Improved FFmpeg path resolution: Prefer system-installed FFmpeg (Docker) with fallback to `ffmpeg-static` (Local).
- Optimized voice manager stability for cross-platform (Darwin/Linux) compatibility.

### Fixed
- Resolved FFmpeg `spawn ENOENT` errors in Docker environments caused by architecture-mismatched binaries.
- Fixed immediate stream termination issues in containerized environments.

## [1.0.1] - 2026-04-08
### Added
- Automated testing infrastructure using `Vitest`.
- ISTQB-aligned test suites for moderation, voice, and firebase services.
- Real-time audio throughput benchmarking for stability verification.
- `ffmpeg-static` integration for automated path resolution in local/docker environments.
- Stacked test reporting system in `internal_tests/TEST_REPORT.md`.
- AI Agent Development Harness for standardized team collaboration.

### Changed
- Refactored `index.ts` by modularizing interaction handlers (commands, buttons, modals).
- Improved audio stability by restoring and optimizing FFmpeg `-re` flags.
- Centralized all Firestore collection names and global constants.
- Enhanced Graceful Shutdown logic to ensure all voice resources are cleaned up.

### Fixed
- Resolved audio speed drift and high-speed playback issues.
- Fixed potential memory leaks by implementing Firebase `onSnapshot` unsubscription.
- Strengthened command security with explicit permission re-validation.

## [1.0.0] - 2026-04-08
### Added
- Initial release of Omni Bot and Dashboard.
- High-performance music streaming using `yt-dlp` and `ffmpeg`.
- Temporary voice channel and nickname management.
- Discord bot dashboard with real-time Firestore integration.
- Graceful shutdown logic for safe deployment.
- Enhanced security with permission validation and shell injection prevention.
- Modular interaction handlers for commands, buttons, and modals.
