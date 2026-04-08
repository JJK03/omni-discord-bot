import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { globalVoiceManager } from "../voiceManager.js";
import { handleMusicButton } from "../musicUI.js";
import { getRoleSettings } from "../commands/roleButton.js";
import { db } from "../firebase.js";
import { COLLECTIONS, COLORS } from "../constants.js";

const CUSTOM_ID = {
  ROLE_ASSIGN: "role_assign_",
  ROLE_GENDER: "role_gender_",
  ROLE_MODAL: "role_modal_",
  ROLE_APPROVE: "role_approve_",
  ROLE_REJECT: "role_reject_",
} as const;

function parseGenderRole(customId: string, prefix: string): { gender: string; roleId: string } {
  const withoutPrefix = customId.slice(prefix.length);
  const sep = withoutPrefix.indexOf("_");
  return { gender: withoutPrefix.slice(0, sep), roleId: withoutPrefix.slice(sep + 1) };
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const { customId } = interaction;

  // [음악 버튼] (omni)
  if (customId.startsWith("music_")) {
    if (!interaction.guild) return;
    const queue = globalVoiceManager.getQueue(interaction.guild.id);
    await handleMusicButton(interaction, queue, () => {
      globalVoiceManager.removeQueue(interaction.guild!.id);
    });
    return;
  }

  // [역할 관련 버튼] (유틸리티)
  if (customId.startsWith(CUSTOM_ID.ROLE_ASSIGN)) {
    const roleId = customId.slice(CUSTOM_ID.ROLE_ASSIGN.length);
    try {
      const member = interaction.member as any;
      if (!member || !member.roles) {
        return interaction.reply({ content: "유저 정보를 확인할 수 없습니다.", flags: ["Ephemeral"] });
      }
      const role = interaction.guild?.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: "해당 역할을 서버에서 찾을 수 없습니다.", flags: ["Ephemeral"] });
      }
      const hasRole = member.roles.cache.has(roleId);
      if (hasRole) {
        const guildId = interaction.guildId;
        const settings = guildId ? await getRoleSettings(guildId) : null;
        const removals: Promise<any>[] = [member.roles.remove(role)];
        if (settings?.maleRoleId && member.roles.cache.has(settings.maleRoleId)) {
          const maleRole = interaction.guild?.roles.cache.get(settings.maleRoleId);
          if (maleRole) removals.push(member.roles.remove(maleRole));
        }
        if (settings?.femaleRoleId && member.roles.cache.has(settings.femaleRoleId)) {
          const femaleRole = interaction.guild?.roles.cache.get(settings.femaleRoleId);
          if (femaleRole) removals.push(member.roles.remove(femaleRole));
        }
        await Promise.all(removals);
        return interaction.reply({ content: `❌ **${role.name}** 역할이 해제되었습니다.`, flags: ["Ephemeral"] });
      }
      const maleBtn = new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID.ROLE_GENDER}남자_${roleId}`)
        .setLabel("🙋‍♂️ 남자")
        .setStyle(ButtonStyle.Primary);
      const femaleBtn = new ButtonBuilder()
        .setCustomId(`${CUSTOM_ID.ROLE_GENDER}여자_${roleId}`)
        .setLabel("🙋‍♀️ 여자")
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(maleBtn, femaleBtn);
      return interaction.reply({ content: "**성별을 선택해주세요.**", components: [row], flags: ["Ephemeral"] });
    } catch (error) {
      console.error("역할 버튼 처리 중 오류:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "역할 처리 중 오류가 발생했습니다.", flags: ["Ephemeral"] });
      }
    }
    return;
  }

  // [성별 선택 버튼] (유틸리티)
  if (customId.startsWith(CUSTOM_ID.ROLE_GENDER)) {
    const { gender, roleId } = parseGenderRole(customId, CUSTOM_ID.ROLE_GENDER);
    const guildId = interaction.guildId;
    try {
      const member = interaction.member as any;
      const role = interaction.guild?.roles.cache.get(roleId);
      if (!role) {
        return interaction.update({ content: "해당 역할을 서버에서 찾을 수 없습니다.", components: [] });
      }
      const settings = guildId ? await getRoleSettings(guildId) : null;
      const requireApproval = settings?.requireApproval ?? false;
      if (requireApproval) {
        const modal = new ModalBuilder()
          .setCustomId(`${CUSTOM_ID.ROLE_MODAL}${gender}_${roleId}`)
          .setTitle("역할 신청");
        const nicknameInput = new TextInputBuilder()
          .setCustomId("nickname")
          .setLabel("서버에서 사용할 닉네임을 입력해주세요")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("닉네임 입력 (최대 32자)")
          .setMaxLength(32)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nicknameInput));
        return interaction.showModal(modal);
      }
      const genderRoleId = gender === "남자" ? settings?.maleRoleId : settings?.femaleRoleId;
      const additions: Promise<any>[] = [member.roles.add(role)];
      if (genderRoleId) {
        const genderRole = interaction.guild?.roles.cache.get(genderRoleId);
        if (genderRole) additions.push(member.roles.add(genderRole));
      }
      await Promise.all(additions);
      return interaction.update({ content: `✅ **${role.name}** 역할이 부여되었습니다. (${gender})`, components: [] });
    } catch (error) {
      console.error("성별 선택 처리 중 오류:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "역할 처리 중 오류가 발생했습니다.", flags: ["Ephemeral"] });
      }
    }
    return;
  }

  // [역할 승인/거절] (유틸리티)
  if (customId.startsWith(CUSTOM_ID.ROLE_APPROVE) || customId.startsWith(CUSTOM_ID.ROLE_REJECT)) {
    const isApprove = customId.startsWith(CUSTOM_ID.ROLE_APPROVE);
    const pendingId = customId.slice(isApprove ? CUSTOM_ID.ROLE_APPROVE.length : CUSTOM_ID.ROLE_REJECT.length);
    try {
      await interaction.deferUpdate();
      const pendingRef = db.collection(COLLECTIONS.PENDING_APPROVALS).doc(pendingId);
      let pending: any = null;
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(pendingRef);
          if (!snap.exists) throw new Error("NOT_FOUND");
          const data = snap.data() as any;
          if (data?.status === "processing") throw new Error("ALREADY_PROCESSING");
          tx.update(pendingRef, { status: "processing" });
          pending = data;
        });
      } catch (txErr: any) {
        if (txErr.message === "NOT_FOUND" || txErr.message === "ALREADY_PROCESSING") {
          return interaction.followUp({ content: "이미 처리된 신청이거나 처리 중인 신청입니다.", flags: ["Ephemeral"] });
        }
        throw txErr;
      }
      if (!pending) return;
      const guild = interaction.guild ?? await interaction.client.guilds.fetch(pending.guildId);
      const [member, role, approvalSettings] = await Promise.all([
        guild.members.fetch(pending.userId).catch(() => null),
        guild.roles.fetch(pending.roleId).catch(() => null),
        isApprove ? getRoleSettings(pending.guildId) : Promise.resolve(null),
      ]);
      if (isApprove) {
        if (member) {
          const genderRoleId = pending.gender === "남자"
            ? approvalSettings?.maleRoleId
            : approvalSettings?.femaleRoleId;
          const genderRole = genderRoleId
            ? await guild.roles.fetch(genderRoleId).catch(() => null)
            : null;
          await Promise.all([
            role ? member.roles.add(role) : Promise.resolve(),
            genderRole ? member.roles.add(genderRole) : Promise.resolve(),
            member.setNickname(pending.nickname).catch(() => {}),
          ]);
        }
      } else {
        member?.send(`❌ **${role?.name ?? "역할"}** 신청이 거절되었습니다.`).catch(() => {});
      }
      try {
        const approvalChannel = await guild.channels.fetch(pending.channelId) as TextChannel;
        const msg = await approvalChannel.messages.fetch(pending.messageId).catch(() => null);
        if (msg) await msg.delete();
        const logEmbed = new EmbedBuilder()
          .setTitle(isApprove ? "✅ 역할 신청 승인" : "❌ 역할 신청 거절")
          .setColor(isApprove ? COLORS.SUCCESS : COLORS.DANGER)
          .addFields(
            { name: "신청자", value: `<@${pending.userId}>`, inline: true },
            { name: "닉네임", value: pending.nickname, inline: true },
            { name: "성별", value: pending.gender, inline: true },
            { name: "역할", value: `<@&${pending.roleId}>`, inline: true },
            { name: isApprove ? "승인한 관리자" : "거절한 관리자", value: `<@${interaction.user.id}>`, inline: true },
          )
          .setTimestamp();
        await approvalChannel.send({ embeds: [logEmbed] });
      } catch (e) {
        console.error("[role_approve/reject] 메시지 처리 중 오류:", e);
      }
      await pendingRef.delete();
    } catch (error) {
      console.error("[role_approve/reject] 처리 중 오류:", error);
    }
    return;
  }
}
