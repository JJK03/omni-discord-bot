import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";

export async function logBotAction(
  guildId: string,
  action: string,
  moderator: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db
    .collection("guilds")
    .doc(guildId)
    .collection("bot_logs")
    .add({
      action,
      moderator,
      ...metadata,
      timestamp: FieldValue.serverTimestamp(),
    });
}
