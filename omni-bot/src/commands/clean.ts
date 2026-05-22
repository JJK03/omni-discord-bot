import { ChatInputCommandInteraction, TextChannel, PermissionFlagsBits } from "discord.js";
import { getGuildFeatures } from "../index.js";
import { logBotAction } from "../logBotAction.js";
import { ERROR_MESSAGES } from "../constants.js";

export async function executeClean(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({
      content: ERROR_MESSAGES.NO_PERMISSION,
      flags: ["Ephemeral"],
    });
  }

  if (!getGuildFeatures(interaction.guildId ?? "").clean) {
    return interaction.reply({
      content: "⚠️ 현재 청소 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }

  const amount = interaction.options.getInteger("수량")!;

  if (amount < 1 || amount > 100) {
    return interaction.reply({
      content: "⚠️ 삭제 수량은 1~100 사이여야 합니다.",
      flags: ["Ephemeral"],
    });
  }

  const channel = interaction.channel as TextChannel;
  let deleted;
  try {
    deleted = await channel.bulkDelete(amount, true);
  } catch {
    return interaction.reply({
      content: "❌ 메시지 삭제에 실패했습니다. 봇 권한을 확인해주세요.",
      flags: ["Ephemeral"],
    });
  }

  if (deleted.size === 0) {
    return interaction.reply({
      content: "⚠️ 삭제 가능한 메시지가 없습니다. (14일 이상 된 메시지는 일괄 삭제가 불가능합니다)",
      flags: ["Ephemeral"],
    });
  }

  await logBotAction(interaction.guildId!, "메시지삭제", interaction.user.tag, {
    channelId: channel.id,
    deletedCount: deleted.size,
  });

  await interaction.reply({
    content: `🧹 성공적으로 ${deleted.size}개의 메시지를 삭제했습니다.`,
    flags: ["Ephemeral"],
  });
}
