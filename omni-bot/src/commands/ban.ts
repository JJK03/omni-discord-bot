import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { getGuildFeatures } from "../index.js";
import { logBotAction } from "../logBotAction.js";
import { ERROR_MESSAGES } from "../constants.js";

export async function executeBan(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({
      content: ERROR_MESSAGES.NO_PERMISSION,
      flags: ["Ephemeral"],
    });
  }

  if (!getGuildFeatures(interaction.guildId ?? "").ban) {
    return interaction.reply({
      content: "⚠️ 현재 차단 기능은 대시보드에서 비활성화되어 있습니다.",
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

  await guild.members.ban(targetUser.id, { reason });

  await logBotAction(guild.id, "차단", interaction.user.tag, { targetUser: targetUser.tag, reason });

  await interaction.reply(
    `🚨 **${targetUser.tag}**님이 차단되었습니다.\n사유: ${reason}`,
  );
}
