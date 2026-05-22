import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { getGuildFeatures } from "../index.js";
import { logBotAction } from "../logBotAction.js";
import { ERROR_MESSAGES } from "../constants.js";

export async function executeNickname(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
    return interaction.reply({
      content: ERROR_MESSAGES.NO_PERMISSION,
      flags: ["Ephemeral"],
    });
  }

  if (!getGuildFeatures(interaction.guildId ?? "").tempNickname) {
    return interaction.reply({
      content: "⚠️ 현재 임시 닉네임 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }
  const targetUser = interaction.options.getUser("유저");
  const targetNickname = interaction.options.getString("변경할닉네임", true);
  const durationString = interaction.options.getString("유지시간", true);

  if (targetNickname.length > 32) {
    return interaction.reply({
      content: "❌ 닉네임은 최대 32자입니다.",
      flags: ["Ephemeral"],
    });
  }

  if (!targetUser) {
    return interaction.reply({
      content: "대상을 찾을 수 없습니다.",
      flags: ["Ephemeral"],
    });
  }

  if (!durationString) {
    return interaction.reply({
      content: "유지시간을 입력해야 합니다.",
      flags: ["Ephemeral"],
    });
  }

  const match = durationString.match(/^(\d+)(일|시간|분)$/);
  if (!match) {
    return interaction.reply({
      content:
        "⚠️ 유지시간 형식이 올바르지 않습니다. '1일', '24시간', '30분' 형식으로 입력해주세요.",
      flags: ["Ephemeral"],
    });
  }

  const amount = parseInt(match[1]!, 10);
  const unit = match[2];

  const expiresAt = new Date();
  if (unit === "일") {
    expiresAt.setDate(expiresAt.getDate() + amount);
  } else if (unit === "시간") {
    expiresAt.setHours(expiresAt.getHours() + amount);
  } else if (unit === "분") {
    expiresAt.setMinutes(expiresAt.getMinutes() + amount);
  }

  const guild = interaction.guild;
  if (!guild) return;

  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply({
      content: "❌ 해당 유저를 서버에서 찾을 수 없습니다.",
      flags: ["Ephemeral"],
    });
  }

  if (!member.manageable) {
    return interaction.reply({
      content: ERROR_MESSAGES.NOT_MANAGEABLE,
      flags: ["Ephemeral"],
    });
  }

  const originalNickname = member.nickname ?? member.user.username;

  try {
    await member.setNickname(targetNickname);
  } catch (err) {
    console.error("닉네임 변경 에러:", err);
    return interaction.reply({
      content: "❌ 닉네임 변경 중 오류가 발생했습니다.",
      flags: ["Ephemeral"],
    });
  }

  await db.collection("temporary_nicknames").add({
    guildId: guild.id,
    userId: targetUser.id,
    userTag: targetUser.tag,
    moderator: interaction.user.tag,
    newNickname: targetNickname,
    originalNickname,
    expiresAt: expiresAt,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });

  await interaction.reply({
    content: `✅ **${targetUser.tag}**님의 닉네임을 **${targetNickname}**으로 임시 변경했습니다. (${durationString} 유지)`,
    flags: ["Ephemeral"],
  });
  await logBotAction(guild.id, "닉네임변경", interaction.user.tag, {
    targetUser: targetUser.tag,
    reason: `(${durationString} 유지) ${targetNickname}으로 변경`,
  });
}
