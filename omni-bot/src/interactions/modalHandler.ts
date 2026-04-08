import {
  ModalSubmitInteraction,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { db } from "../firebase.js";
import { COLLECTIONS, COLORS } from "../constants.js";
import { logAnonymousMessage } from "../services/firebaseService.js";
import { getRoleSettings } from "../commands/roleButton.js";

const CUSTOM_ID = {
  ROLE_MODAL: "role_modal_",
} as const;

function parseGenderRole(customId: string, prefix: string): { gender: string; roleId: string } {
  const withoutPrefix = customId.slice(prefix.length);
  const sep = withoutPrefix.indexOf("_");
  return { gender: withoutPrefix.slice(0, sep), roleId: withoutPrefix.slice(sep + 1) };
}

export async function handleModalInteraction(interaction: ModalSubmitInteraction) {
  const { customId } = interaction;

  // [익명 메시지 모달] (omni)
  if (customId === "anonymous_modal") {
    const message = interaction.fields.getTextInputValue("anonymous_message_input");
    const channel = interaction.channel;
    if (channel && channel.isTextBased() && "send" in channel) {
      try {
        await (channel as TextChannel).send({
          embeds: [{
            color: COLORS.ANONYMOUS,
            author: { name: "익명의 요원", icon_url: "https://cdn.discordapp.com/embed/avatars/0.png" },
            description: message,
            timestamp: new Date().toISOString(),
            footer: { text: "대나무숲 시스템" },
          }],
        });
        await interaction.reply({ content: "🤫 익명 메시지가 성공적으로 전달되었습니다.", flags: ["Ephemeral"] });
        await logAnonymousMessage(interaction.guildId!, interaction.user.tag, interaction.user.id, channel.id, message);
      } catch (err) {
        console.error("익명 메시지 전송 실패:", err);
        await interaction.reply({ content: "메시지 전송 중 오류가 발생했습니다.", flags: ["Ephemeral"] });
      }
    }
    return;
  }

  // [역할 신청 모달] (유틸리티)
  if (customId.startsWith(CUSTOM_ID.ROLE_MODAL)) {
    const { gender, roleId } = parseGenderRole(customId, CUSTOM_ID.ROLE_MODAL);
    const nickname = interaction.fields.getTextInputValue("nickname").trim();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) {
      return interaction.reply({ content: "서버 정보를 확인할 수 없습니다.", flags: ["Ephemeral"] });
    }
    try {
      await interaction.deferReply({ ephemeral: true });
      const settings = await getRoleSettings(guildId);
      if (!settings?.approvalChannelId) {
        return interaction.editReply({ content: "관리자 승인 채널이 설정되지 않았습니다. 관리자에게 문의해주세요." });
      }
      const role = interaction.guild?.roles.cache.get(roleId);
      const roleName = role?.name ?? roleId;
      const member = interaction.member as any;
      const tempPendingId = `${guildId}_${userId}_${roleId}_${Date.now()}`;
      const requestEmbed = new EmbedBuilder()
        .setTitle("📋 역할 신청")
        .setColor(COLORS.PRIMARY)
        .addFields(
          { name: "신청자", value: `<@${userId}> (${interaction.user.tag})`, inline: true },
          { name: "입력한 닉네임", value: nickname, inline: true },
          { name: "성별", value: gender, inline: true },
          { name: "신청 역할", value: `<@&${roleId}> (${roleName})`, inline: true },
          { name: "현재 닉네임", value: member.displayName, inline: true },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "아래 버튼을 눌러 승인 또는 거절하세요." });
      const approveBtn = new ButtonBuilder()
        .setCustomId(`role_approve_${tempPendingId}`)
        .setLabel("✅ 승인")
        .setStyle(ButtonStyle.Success);
      const rejectBtn = new ButtonBuilder()
        .setCustomId(`role_reject_${tempPendingId}`)
        .setLabel("❌ 거절")
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveBtn, rejectBtn);
      const approvalChannel = await interaction.guild?.channels
        .fetch(settings.approvalChannelId)
        .catch(() => null) as TextChannel | null;
      if (!approvalChannel || !approvalChannel.isTextBased()) {
        return interaction.editReply({ content: "관리자 승인 채널을 찾을 수 없습니다. 관리자에게 문의해주세요." });
      }
      const sentMsg = await approvalChannel.send({ embeds: [requestEmbed], components: [row] });
      await db.collection(COLLECTIONS.PENDING_APPROVALS).doc(tempPendingId).set({
        userId, roleId, nickname, gender, guildId,
        channelId: settings.approvalChannelId,
        messageId: sentMsg.id,
        requestedAt: new Date(),
      });
      await interaction.editReply({ content: "✅ 역할 신청이 완료되었습니다. 관리자 승인 후 역할이 부여됩니다." });
    } catch (error) {
      console.error("[role_modal] 처리 중 오류:", error);
      if (interaction.deferred) {
        await interaction.editReply({ content: "신청 처리 중 오류가 발생했습니다." });
      }
    }
    return;
  }
}
