# Omni - Integrated Discord Management Solution

Omni is a comprehensive, multi-purpose Discord bot and web dashboard system designed for advanced server management and community engagement. This monorepo contains both the backend bot service (`omni-bot`) and the frontend management interface (`omni-dashboard`).

## Project Architecture

The project is structured as a monorepo:
- **omni-bot**: A TypeScript-based Discord bot utilizing `discord.js` and `Firebase Admin SDK`.
- **omni-dashboard**: A React-based web application built with `Vite` and `Tailwind CSS` for real-time bot configuration.

## Key Features

### Music and Entertainment
- High-performance YouTube streaming via `yt-dlp` and `ffmpeg`.
- Interactive music control panel with dynamic status updates.
- Automated resource cleanup and auto-exit when voice channels are empty.

### Server Moderation and Management
- **Temporary Channels**: Creation of voice channels that automatically delete after a set duration.
- **Temporary Nicknames**: Time-limited nickname changes with automatic reversion.
- **Moderation Tools**: Streamlined kick, ban, and bulk message deletion (clean) commands with permission validation.

### Community Engagement
- **Anonymous Messaging**: A "Bamboo Forest" style system for anonymous user interactions.
- **Role Management**: Automated role assignment system with optional administrator approval workflows.
- **Member Notifications**: Customizable welcome and leave messages with dynamic image generation.

## Prerequisites

Before setting up Omni, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- FFmpeg (required for music streaming)
- yt-dlp (required for music streaming)
- A Firebase Project (Firestore enabled)
- A Discord Application (Bot token and Client ID)

## Setup Instructions

### 1. Bot Configuration (omni-bot)

1. Navigate to the bot directory:
   ```bash
   cd omni-bot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   DISCORD_TOKEN=<YOUR_BOT_TOKEN>
   DISCORD_CLIENT_ID=<YOUR_CLIENT_ID>
   # Add Firebase Admin credentials or configuration paths as needed
   ```
4. Deploy slash commands to Discord:
   ```bash
   npm run deploy-commands
   ```
5. Start the bot:
   ```bash
   npm run dev
   ```

### 2. Dashboard Configuration (omni-dashboard)

1. Navigate to the dashboard directory:
   ```bash
   cd omni-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Firebase client configuration:
   ```env
   VITE_FIREBASE_API_KEY=<API_KEY>
   VITE_FIREBASE_AUTH_DOMAIN=<AUTH_DOMAIN>
   VITE_FIREBASE_PROJECT_ID=<PROJECT_ID>
   VITE_FIREBASE_STORAGE_BUCKET=<STORAGE_BUCKET>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<SENDER_ID>
   VITE_FIREBASE_APP_ID=<APP_ID>
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Security and Best Practices

- **Environment Variables**: Never commit `.env` files to source control. Ensure they are added to your `.gitignore`.
- **Docker Security**: A `.dockerignore` file is implemented to ensure only necessary source files are included in the build, preventing sensitive local data and incompatible binaries from entering the container.
- **Cross-Platform Compatibility**: The system intelligently resolves binary paths (FFmpeg), favoring system-installed versions in production (Docker) and providing automated fallbacks for local development.
- **Graceful Shutdown**: The bot is configured to handle `SIGTERM` and `SIGINT` signals to ensure all voice connections are closed and temporary resources are cleaned up before exit.
- **Permission Validation**: All moderation commands include dual-layer validation (Discord API level and application logic level).

## Quality Assurance

Omni follows strict software quality standards:
- **Automated Testing**: Comprehensive unit and integration tests using `Vitest`.
- **Stability Benchmarking**: Real-time throughput monitoring for audio streams to prevent speed drift.
- **ISTQB Alignment**: Testing methodologies aligned with international software testing standards.
- **AI Development Harness**: Standardized guidelines for AI agents to ensure consistent code quality and security.

## License

This project is licensed under the ISC License.
