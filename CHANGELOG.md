# Changelog

All notable changes to this project will be documented in this file.

## [1.1.3] - 2026-05-24

### Fixed
- Stop button now cancels in-flight playlist enqueue: adding tracks mid-batch (Apple Music / YouTube playlist) is interrupted immediately when stop is pressed. Previously, batch additions continued even after the queue was destroyed.

## [1.1.2] - 2026-05-23

### Fixed
- Replaced FFmpeg streaming pipeline with yt-dlp download-then-play to eliminate audio speedup and mid-song jumps caused by TLS reconnect frame gaps.
- Reduced `maxMissedFrames` from 750 to 50; switched to `StreamType.WebmOpus` for timestamp-controlled playback speed.
- Fixed double-advance bug: removed `playNext()` from `player.on("error")` handler (error auto-transitions to Idle which already triggers next track).
- Fixed skip-during-download race: `_playToken` detects stale download after skip and discards the file without playing.
- Fixed zombie disconnect timer: Idle handler now guards against `!this.connection` to prevent re-arming after `destroy()`.
- Fixed empty GuildQueue creation on every VoiceStateUpdate for guilds not using music (`peekQueue()` added).
- Fixed `enqueue()` concurrent playNext race with `!currentTrack` guard.
- Fixed `removeTrack()` leaving orphaned prefetch cache entries and tmp files.
- Fixed `musicMessages` Map leak on `GuildDelete`.
- Fixed `getYouTubePlaylist` hanging indefinitely without a timeout.
- Fixed `client.destroy()` not being awaited in graceful shutdown.

### Added
- Next-track prefetch: downloads the next song in background immediately after current playback starts, reducing inter-track silence.

## [1.1.1] - 2026-05-23

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
