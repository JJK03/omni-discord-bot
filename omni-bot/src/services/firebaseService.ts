import { db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { Guild } from "discord.js";
import { COLLECTIONS } from "../constants.js";

export async function registerGuildToDB(guild: Guild) {
  try {
    await db.collection(COLLECTIONS.GUILDS).doc(guild.id).set(
      {
        id: guild.id,
        name: guild.name,
        iconURL: guild.iconURL({ size: 64 }) ?? null,
        memberCount: guild.memberCount,
        activeBots: FieldValue.arrayUnion("omni"),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error(`[Guild Register] ${guild.name} 등록 실패:`, err);
  }
}

export async function logAnonymousMessage(guildId: string, authorTag: string, authorId: string, channelId: string, message: string) {
  await db.collection(COLLECTIONS.GUILDS).doc(guildId).collection(COLLECTIONS.ANONYMOUS_LOGS).add({
    authorTag,
    authorId,
    channelId,
    message,
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function createFeatureDocIfMissing(guildId: string, defaultFeatures: any) {
  const docRef = db.collection(COLLECTIONS.GUILDS).doc(guildId).collection(COLLECTIONS.BOT_SETTINGS).doc(COLLECTIONS.FEATURES);
  const doc = await docRef.get();
  if (!doc.exists) {
    await docRef.set(defaultFeatures);
  }
}
