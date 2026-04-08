import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("아바타")
  .setDescription("지정한 사용자의 프로필 사진을 확대해서 보여준다")
  .addUserOption((option) =>
    option
      .setName("대상")
      .setDescription("아바타를 확인할 사용자 선택")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("대상")!;
  const member = interaction.options.getMember("대상") as GuildMember;

  const avatarUrl = user.displayAvatarURL({ size: 1024 });
  const displayName = member?.displayName || user.username;

  const embed = new EmbedBuilder()
    .setTitle(`${displayName}의 아바타`)
    .setImage(avatarUrl)
    .setColor(0x3498db);

  await interaction.reply({
    embeds: [embed],
    allowedMentions: { parse: [] },
  });
}
