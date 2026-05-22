import { ChatInputCommandInteraction } from "discord.js";
import { executeTempChannel } from "../commands/temp-channel.js";
import { executeKick } from "../commands/kick.js";
import { executeBan } from "../commands/ban.js";
import { executeClean } from "../commands/clean.js";
import { executeNickname } from "../commands/nickname.js";
import { executeMusic } from "../commands/music.js";
import { executeAnonymous } from "../commands/anonymous.js";
import { execute as executeAvatar } from "../commands/avatar.js";
import { execute as executeRoleButton } from "../commands/roleButton.js";

export async function handleCommandInteraction(interaction: ChatInputCommandInteraction) {
  const { commandName } = interaction;

  try {
    // omni 명령어
    if (commandName === "임시채널") {
      await executeTempChannel(interaction);
    } else if (commandName === "추방") {
      await executeKick(interaction);
    } else if (commandName === "차단") {
      await executeBan(interaction);
    } else if (commandName === "청소") {
      await executeClean(interaction);
    } else if (commandName === "닉네임변경") {
      await executeNickname(interaction);
    } else if (commandName === "노래") {
      await executeMusic(interaction);
    } else if (commandName === "익명") {
      await executeAnonymous(interaction);

    // 유틸리티 명령어
    } else if (commandName === "아바타") {
      await executeAvatar(interaction);
    } else if (commandName === "역할세팅") {
      await executeRoleButton(interaction);
    }
  } catch (error: any) {
    console.error(`[Command Error: ${commandName}]`, error);
    if (error.code === 10062) return;
    try {
      const replyOptions = {
        content: "❌ 명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        flags: ["Ephemeral"] as const,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    } catch (innerError) {
      console.error("[Fallback Error Handling Failed]", innerError);
    }
  }
}
