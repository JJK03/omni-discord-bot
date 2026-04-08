import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "../firebase.js";
import { COLLECTIONS } from "../constants.js";

// Firestore에서 설정 가져오기
export async function getRoleSettings(guildId: string) {
  const docRef = db
    .collection(COLLECTIONS.GUILDS)
    .doc(guildId)
    .collection(COLLECTIONS.BOT_SETTINGS)
    .doc(COLLECTIONS.ROLE_SETTINGS);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return docSnap.data() as {
      channelId: string;
      messageTitle: string;
      messageDescription: string;
      options: {
        id: string;
        label: string;
        emoji: string;
        roleId: string;
      }[];
      requireApproval: boolean;
      approvalChannelId: string;
      maleRoleId: string;
      femaleRoleId: string;
    };
  }
  return null;
}

export const data = new SlashCommandBuilder()
  .setName("역할세팅")
  .setDescription("대시보드에 설정된 역할 부여 메시지를 이 채널에 생성합니다.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // 지연 응답 설정 (3초 타임아웃 방지)
  await interaction.deferReply({ ephemeral: true });

  // 1. 관리자 권한 확인
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.editReply({
      content: "이 명령어를 사용할 권한이 없습니다.",
    });
  }

  // 2. 파이어베이스에서 설정 불러오기
  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.editReply({ content: "서버 정보를 확인할 수 없습니다." });
  }
  const settings = await getRoleSettings(guildId);

  if (!settings || !settings.options || settings.options.length === 0) {
    return interaction.editReply({
      content:
        "⚠️ 대시보드에서 역할 버튼 설정이 완료되지 않았거나 옵션이 없습니다.",
    });
  }

  // 3. 임베드 생성
  const embed = new EmbedBuilder()
    .setTitle(settings.messageTitle || "역할 선택")
    .setDescription(
      settings.messageDescription || "아래 버튼을 눌러 역할을 선택하세요.",
    )
    .setColor("#5865F2");

  // 4. 액션 로우 및 버튼 생성 (Discord는 한 행에 최대 5개의 버튼 허용)
  const buttons = settings.options.map((opt) => {
    const btn = new ButtonBuilder()
      .setCustomId(`role_assign_${opt.roleId}`)
      .setLabel(opt.label || "역할")
      .setStyle(ButtonStyle.Secondary);

    if (opt.emoji) {
      const emojiTrimmed = opt.emoji.trim();
      // Only set if we actually have some text, discord.js will throw an error if the emoji is a malformed string or empty spaces
      if (emojiTrimmed.length > 0) {
        // 간단한 정규식으로 유니코드 이모지인지, 혹은 커스텀 이모지 구조인지 검증
        const isCustomEmoji = /<a?:.+:\d+>/i.test(emojiTrimmed);
        const isUnicodeEmoji = /\p{Emoji}/u.test(emojiTrimmed);

        if (isCustomEmoji || isUnicodeEmoji) {
          btn.setEmoji(emojiTrimmed);
        }
      }
    }
    return btn;
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  try {
    const channel = interaction.channel as import("discord.js").TextChannel;
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({
        content: "메시지를 보낼 수 없는 채널입니다.",
        flags: ["Ephemeral"],
      });
    }

    // 메시지 전송
    await channel.send({
      embeds: [embed],
      components: [row],
    });

    // 명령어 응답 (사용자에게만 보임)
    await interaction.editReply({
      content: "✅ 역할 부여 메시지를 성공적으로 생성했습니다.",
    });
  } catch (error) {
    console.error("역할 메시지 생성 중 오류:", error);
    const replyPayload = {
      content: "메시지를 생성하는 도중 오류가 발생했습니다.",
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(replyPayload);
    } else {
      await interaction.reply({ ...replyPayload, ephemeral: true });
    }
  }
}
