import { db } from "./firebase.js";
import { COLLECTIONS } from "./constants.js";
import { createFeatureDocIfMissing } from "./services/firebaseService.js";

export interface BotFeatures {
  kick: boolean;
  ban: boolean;
  clean: boolean;
  tempChannel: boolean;
  tempNickname: boolean;
  music: boolean;
  anonymousChat: boolean;
  musicChannelId?: string;
  musicAnnouncementMessageId?: string;
}

export const DEFAULT_FEATURES: BotFeatures = {
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

export function listenToBotSettings(guildId: string) {
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
          musicChannelId: data["musicChannelId"],
          musicAnnouncementMessageId: data["musicAnnouncementMessageId"],
        });
      } else {
        createFeatureDocIfMissing(guildId, DEFAULT_FEATURES);
        guildFeaturesMap.set(guildId, { ...DEFAULT_FEATURES });
      }
    });

  settingsUnsubMap.set(guildId, unsub);
}

export function stopListeningToBotSettings(guildId: string) {
  const unsub = settingsUnsubMap.get(guildId);
  if (unsub) {
    unsub();
    settingsUnsubMap.delete(guildId);
  }
  guildFeaturesMap.delete(guildId);
}

export function clearAllSettingsListeners() {
  settingsUnsubMap.forEach((unsub) => unsub());
  settingsUnsubMap.clear();
  guildFeaturesMap.clear();
}
