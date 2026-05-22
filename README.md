<img src="https://raw.githubusercontent.com/jinsh1210/omni-discord-bot/main/assets/app_icon.png" align="left" height="100" alt="Omni Bot Icon" />

# Omni
High-performance, modular Discord bot — music streaming, server management, and community tools in one ecosystem.

[![GitHub release](https://img.shields.io/github/v/release/jinsh1210/omni-discord-bot?cacheSeconds=0)](https://github.com/jinsh1210/omni-discord-bot/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Discord-5865F2)](https://github.com/jinsh1210/omni-discord-bot)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<br />

## Screenshots

![Dashboard](https://raw.githubusercontent.com/jinsh1210/omni-discord-bot/main/assets/dashboard.png)

## Features

- **High-fidelity music streaming**: FFmpeg pipeline with speed-drift protection (`-re` flag) and TLS reconnect tolerance (up to 10s gap). Plays YouTube and Apple Music links.
- **Apple Music support**: Resolves Apple Music track and playlist URLs via the iTunes API, searches YouTube, and plays — 181-track playlist starts its first song in ~1.3s.
- **Repeat & shuffle**: Single-track repeat, full-queue repeat, and shuffle mode with automatic queue cycling.
- **Real-time dashboard**: Firestore-backed React dashboard to manage per-guild features and monitor the music panel live.
- **Server management**: Time-limited nickname changes, auto-delete temporary channels, kick/ban/message-purge commands.
- **Community tools**: Anonymous message channel and admin-approval role assignment button.

## Installation

### Requirements

- Node.js v18+
- FFmpeg (must be on system PATH)
- yt-dlp (must be on system PATH)
- Firebase project and Discord bot token

### Setup

```sh
# Clone and install dependencies
git clone https://github.com/jinsh1210/omni-discord-bot.git
cd omni-discord-bot
npm install

# Configure environment variables
cp omni-bot/.env.example omni-bot/.env
cp omni-dashboard/.env.example omni-dashboard/.env
# Fill in tokens and Firebase config in each .env file

# Run
npm run dev
```

### Docker

```sh
cd omni-bot
docker build -t omni-bot .
docker run --env-file .env omni-bot
```

## Compatibility

| Version | Node.js | Notes |
|---------|---------|-------|
| v1.1.0 (current) | v18+ | Apple Music support, batch playlist loading |
| v1.0.3 | v18+ | Music repeat/shuffle |
| v1.0.2 | v18+ | Docker FFmpeg fix |
| v1.0.1 | v18+ | ⚠️ Audio bug — do not use |

## Credits

- [discord.js](https://discord.js.org) — Discord API client
- [@discordjs/voice](https://github.com/discordjs/voice) — Voice channel streaming pipeline
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube metadata extraction and stream URL resolution
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — Bundled static FFmpeg binary
- [Firebase](https://firebase.google.com) — Real-time Firestore database and auth
- [Vite](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com) — Dashboard build system

## License

[MIT](LICENSE)
