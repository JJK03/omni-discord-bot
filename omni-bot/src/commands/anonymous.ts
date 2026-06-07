import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { getGuildFeatures } from "../guildState.js";

export async function executeAnonymous(
  interaction: ChatInputCommandInteraction,
) {
  if (!getGuildFeatures(interaction.guildId ?? "").anonymousChat) {
    return interaction.reply({
      content:
        "⚠️ 현재 익명 소통방(대나무숲) 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }

  // 모달(Modal) 창 생성
  const modal = new ModalBuilder()
    .setCustomId("anonymous_modal")
    .setTitle("비밀 편지 쓰기");

  // 메시지 입력 칸 추가
  const messageInput = new TextInputBuilder()
    .setCustomId("anonymous_message_input")
    .setLabel("익명으로 남길 메시지를 적어주세요.")
    .setStyle(TextInputStyle.Paragraph) // 긴 글 작성 가능
    .setPlaceholder("서버 멤버들은 누가 썼는지 알 수 없어요!")
    .setMinLength(1)
    .setMaxLength(2000)
    .setRequired(true);

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    messageInput,
  );
  modal.addComponents(actionRow);

  // 사용자에게 모달 띄우기 (await 안 하면 에러 남)
  await interaction.showModal(modal);
}
