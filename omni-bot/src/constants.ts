export const COLLECTIONS = {
  GUILDS: "guilds",
  BOT_SETTINGS: "bot_settings",
  FEATURES: "features",
  TEMP_NICKNAMES: "temporary_nicknames",
  TEMP_CHANNELS: "temporary_channels",
  PENDING_APPROVALS: "pending_approvals",
  ROLE_SETTINGS: "role_settings",
  ANONYMOUS_LOGS: "anonymous_logs",
} as const;

export const COLORS = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  DANGER: 0xed4245,
  ANONYMOUS: 0x9b59b6,
} as const;

export const DELAYS = {
  GUILD_REGISTER_STAGGER: 50,
  AUTO_EXIT_TIMEOUT: 5 * 60 * 1000,
  SCHEDULE_INTERVAL: 60000,
} as const;

export const ERROR_MESSAGES = {
  NO_PERMISSION: "❌ 명령어를 실행할 권한이 없습니다.",
  NOT_MANAGEABLE: "❌ 해당 유저를 관리할 권한이 봇에게 없습니다. (상위 역할자 등)",
  COMMAND_ERROR: "❌ 명령어 실행 중 오류가 발생했습니다.",
} as const;
