import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { getGuildFeatures } from "../index.js";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants.js";

export async function executeTempChannel(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: ERROR_MESSAGES.NO_PERMISSION,
      flags: ["Ephemeral"],
    });
  }

  if (!getGuildFeatures(interaction.guildId ?? "").tempChannel) {
    return interaction.reply({
      content: "⚠️ 현재 이 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }

  const channelName = interaction.options.getString("채널이름", true);
  const durationMinutes = interaction.options.getInteger("유지시간", true);

  if (channelName.length < 1 || channelName.length > 100) {
    return interaction.reply({
      content: "❌ 채널 이름은 1~100자 사이여야 합니다.",
      flags: ["Ephemeral"],
    });
  }

  // 만료 시간 계산
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

  // 음성 채널 생성 (명령어 사용자에게 관리 권한 부여)
  const guild = interaction.guild;
  if (!guild) return;

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
          ],
        },
      ],
    });

    await db.collection(COLLECTIONS.TEMP_CHANNELS).add({
      channelId: channel.id,
      channelName: channel.name,
      guildId: guild.id,
      creatorId: interaction.user.id,
      createdBy: interaction.member instanceof GuildMember
        ? interaction.member.displayName
        : interaction.user.displayName ?? interaction.user.username,
      expiresAt: expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 슬래시 명령은 반드시 reply 처리 필요 → ephemeral 후 즉시 삭제
    await interaction.deferReply({ flags: ["Ephemeral"] });
    await interaction.deleteReply();
  } catch (err) {
    console.error("임시 채널 생성 실패:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ 임시 채널 생성 중 오류가 발생했습니다.",
        flags: ["Ephemeral"],
      });
    }
  }
}
