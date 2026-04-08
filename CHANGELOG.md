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

## [1.0.1] - 2026-04-08 [YANKED - CRITICAL AUDIO BUG]
> **Warning**: This version contains a critical bug where audio playback fails in Docker environments due to architecture mismatch and missing `-re` flags. Please use v1.0.2 instead.

### Added
- Automated testing infrastructure using `Vitest`.
- ISTQB-aligned test suites for moderation, voice, and firebase services.
- AI Agent Development Harness for standardized team collaboration.

## [1.0.0] - 2026-04-08 [DEPRECATED - AUDIO BUG]
> **Notice**: Initial release version. Audio streaming logic is unstable and may experience speed drift.

### Added
- Initial release of Omni Bot and Dashboard.
- High-performance music streaming using `yt-dlp` and `ffmpeg`.
- Discord bot dashboard with real-time Firestore integration.
