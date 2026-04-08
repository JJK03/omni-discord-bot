import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  Collection,
} from "discord.js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { COLORS, DELAYS, COLLECTIONS } from "./constants.js";
import {
  registerGuildToDB,
  createFeatureDocIfMissing,
} from "./services/firebaseService.js";

// 음악
import { globalVoiceManager } from "./voiceManager.js";
export { globalVoiceManager };

// 인터랙션 핸들러
import { handleButtonInteraction } from "./interactions/buttonHandler.js";
import { handleModalInteraction } from "./interactions/modalHandler.js";
import { handleCommandInteraction } from "./interactions/commandHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────
// 클라이언트 생성
// ─────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember, Partials.User, Partials.Message],
}) as Client & { commands: Collection<string, any> };

client.commands = new Collection();

// ─────────────────────────────────────────
// omni: 서버별 기능 설정
// ─────────────────────────────────────────
interface BotFeatures {
  kick: boolean;
  ban: boolean;
  clean: boolean;
  tempChannel: boolean;
  tempNickname: boolean;
  music: boolean;
  anonymousChat: boolean;
}

const DEFAULT_FEATURES: BotFeatures = {
  kick: true,
  ban: true,
  clean: true,
  tempChannel: true,
  tempNickname: true,
  music: true,
  anonymousChat: true,
};

const guildFeaturesMap = new Map<string, BotFeatures>();
const settingsUnsubMap = new Map<string, () => void>();

export function getGuildFeatures(guildId: string): BotFeatures {
  return guildFeaturesMap.get(guildId) ?? { ...DEFAULT_FEATURES };
}

function listenToBotSettings(guildId: string) {
  // 기존 리스너가 있다면 먼저 해제
  if (settingsUnsubMap.has(guildId)) {
    settingsUnsubMap.get(guildId)!();
  }

  const unsub = db.collection(COLLECTIONS.GUILDS)
    .doc(guildId)
    .collection(COLLECTIONS.BOT_SETTINGS)
    .doc(COLLECTIONS.FEATURES)
    .onSnapshot((docSnap) => {
      if (docSnap.exists) {
        const data = docSnap.data()!;
        guildFeaturesMap.set(guildId, {
          tempChannel: data["tempChannel"] ?? true,
          tempNickname: data["tempNickname"] ?? true,
          kick: data["kick"] ?? true,
          ban: data["ban"] ?? true,
          clean: data["clean"] ?? true,
          music: data["music"] ?? true,
          anonymousChat: data["anonymousChat"] ?? true,
        });
      } else {
        createFeatureDocIfMissing(guildId, DEFAULT_FEATURES);
        guildFeaturesMap.set(guildId, { ...DEFAULT_FEATURES });
      }
    });

  settingsUnsubMap.set(guildId, unsub);
}

// ─────────────────────────────────────────
// omni: 만료 닉네임/채널 정리
// ─────────────────────────────────────────
async function checkAndRestoreExpiredNicknames() {
  const now = new Date();
  try {
    const [expiredSnap, forceSnap] = await Promise.all([
      db.collection(COLLECTIONS.TEMP_NICKNAMES).where("status", "==", "active").where("expiresAt", "<=", now).get(),
      db.collection(COLLECTIONS.TEMP_NICKNAMES).where("status", "==", "force_revert").get(),
    ]);
    const docs = [...expiredSnap.docs, ...forceSnap.docs];

    await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        const guild = client.guilds.cache.get(data["guildId"]);
        if (guild) {
          const member = await guild.members.fetch(data["userId"]).catch(() => null);
          if (member) {
            if (member.manageable) {
              await member.setNickname(data["originalNickname"] ?? null).catch(() => {});
            } else {
              // 권한 부족 시 로그 남김
              await db.collection(COLLECTIONS.TEMP_NICKNAMES).doc(doc.id).update({ status: "error", error: "Permission Denied" });
              return;
            }
          }
        }
        await doc.ref.delete();
      }),
    );
  } catch (error) {
    console.error("닉네임 스케줄러 에러:", error);
  }
}

async function checkAndRemoveExpiredChannels() {
  const now = new Date();
  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEMP_CHANNELS)
      .where("expiresAt", "<=", now)
      .get();
    await Promise.all(
      snapshot.docs.map(async (document) => {
        const data = document.data();
        const channelId = data["channelId"];
        const guildId = data["guildId"];
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(channelId);
          if (channel) {
            if (channel.isVoiceBased()) {
              if (channel.members.size === 0) {
                await channel.delete("유지 시간 만료 및 참가자 없음");
                await db.collection(COLLECTIONS.TEMP_CHANNELS).doc(document.id).delete();
              }
            } else {
              await channel.delete("유지 시간 만료");
              await db.collection(COLLECTIONS.TEMP_CHANNELS).doc(document.id).delete();
            }
          } else {
            await db.collection(COLLECTIONS.TEMP_CHANNELS).doc(document.id).delete();
          }
        }
      }),
    );
  } catch (error) {
    console.error("스케줄러 에러:", error);
  }
}

// ─────────────────────────────────────────
// events/ 폴더 동적 로딩
// ─────────────────────────────────────────
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const eventModule = await import(`file://${filePath}`);
  const event = eventModule.default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ─────────────────────────────────────────
// ClientReady
// ─────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`[omni-bot] 준비 완료! 로그인 계정: ${c.user.tag}`);
  globalVoiceManager.setClient(c);

  // 1분마다 임시 채널/닉네임 정리 (setInterval 사용)
  setInterval(() => {
    checkAndRemoveExpiredChannels();
    checkAndRestoreExpiredNicknames();
  }, DELAYS.SCHEDULE_INTERVAL);

  // 모든 서버 등록 및 리스너 시작 (Staggering 적용)
  for (const guild of c.guilds.cache.values()) {
    await registerGuildToDB(guild);
    listenToBotSettings(guild.id);
    await new Promise((resolve) => setTimeout(resolve, DELAYS.GUILD_REGISTER_STAGGER));
  }
});

// ─────────────────────────────────────────
// GuildCreate / GuildDelete
// ─────────────────────────────────────────
client.on(Events.GuildCreate, async (guild) => {
  console.log(`[GuildCreate] 새 서버 가입: ${guild.name}`);
  await registerGuildToDB(guild);
  listenToBotSettings(guild.id);
});

client.on(Events.GuildDelete, (guild) => {
  console.log(`[GuildDelete] 서버 퇴장: ${guild.name} (${guild.id})`);
  const unsub = settingsUnsubMap.get(guild.id);
  if (unsub) {
    unsub();
    settingsUnsubMap.delete(guild.id);
  }
  guildFeaturesMap.delete(guild.id);
});

// ─────────────────────────────────────────
// VoiceStateUpdate: 음악 큐 정리
// 봇 자신이 채널에서 나갔을 때 GuildQueue 정리
// ─────────────────────────────────────────
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (oldState.member?.id !== client.user?.id) return;
  if (oldState.channel && !newState.channel) {
    const guildId = oldState.guild.id;
    const queue = globalVoiceManager.getQueue(guildId);
    if (queue.connection) {
      queue.destroy();
    }
  }
});

// ─────────────────────────────────────────
// InteractionCreate: 통합 핸들러 (위임)
// ─────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommandInteraction(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModalInteraction(interaction);
  } else if (interaction.isStringSelectMenu()) {
    // 음악 삭제 메뉴 등
    if (interaction.customId === "music_delete_select") {
      if (!interaction.guild) return;
      const { handleMusicSelect } = await import("./musicUI.js");
      const queue = globalVoiceManager.getQueue(interaction.guild.id);
      await handleMusicSelect(interaction, queue);
    }
  }
});

// ─────────────────────────────────────────
// 안전한 종료 (Graceful Shutdown)
// ─────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`${signal} 수신: 봇 안전 종료 절차 시작...`);

  // 1. 모든 음성 채널 연결 및 음악 패널 정리
  const allQueues = globalVoiceManager.getAllQueues();
  if (allQueues.size > 0) {
    console.log(`[Shutdown] ${allQueues.size}개의 음성 큐를 정리합니다...`);
    // 순차적으로 정리 (비동기 병렬 처리)
    await Promise.all(
      [...allQueues.values()].map(async (queue) => {
        try {
          // destroy() 내부에서 panel 삭제 등의 콜백이 수행됨
          await queue.destroy();
        } catch (e) {
          console.error(`[Shutdown:Error] ${queue.guildId} 정리 실패:`, e);
        }
      }),
    );
  }

  // 2. 리스너 해제
  settingsUnsubMap.forEach((unsub) => unsub());
  settingsUnsubMap.clear();

  // 3. 디스코드 클라이언트 종료
  console.log("[Shutdown] Discord API 연결 해제 중...");
  client.destroy();

  console.log(`[Shutdown] ${signal} 처리 완료. 프로세스를 종료합니다.`);
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

client.on(Events.Error, (error) => {
  console.error("[Client Error]", error);
});

client.login(process.env.DISCORD_TOKEN);
