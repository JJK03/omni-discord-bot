import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { getGuildFeatures } from "../guildState.js";
import { logBotAction } from "../logBotAction.js";
import { ERROR_MESSAGES } from "../constants.js";

export async function executeKick(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({
      content: ERROR_MESSAGES.NO_PERMISSION,
      flags: ["Ephemeral"],
    });
  }

  if (!getGuildFeatures(interaction.guildId ?? "").kick) {
    return interaction.reply({
      content: "⚠️ 현재 추방 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }

  const targetUser = interaction.options.getUser("유저");
  const reason = interaction.options.getString("사유") || "사유 없음";

  if (!targetUser) {
    await interaction.reply({
      content: "대상을 찾을 수 없습니다.",
      flags: ["Ephemeral"],
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  let member;
  try {
    member = await guild.members.fetch(targetUser.id);
  } catch {
    return interaction.reply({
      content: "❌ 해당 유저를 서버에서 찾을 수 없습니다.",
      flags: ["Ephemeral"],
    });
  }

  try {
    await member.kick(reason);
  } catch {
    return interaction.reply({
      content: "❌ 추방에 실패했습니다. 봇 권한을 확인해주세요.",
      flags: ["Ephemeral"],
    });
  }

  await logBotAction(guild.id, "추방", interaction.user.tag, { targetUser: targetUser.tag, reason });

  await interaction.reply(
    `✅ **${targetUser.tag}**님이 추방되었습니다.\n사유: ${reason}`,
  );
}
