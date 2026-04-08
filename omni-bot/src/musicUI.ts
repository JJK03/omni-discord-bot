import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type TextChannel,
  type Message,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import type { GuildQueue } from "./voiceManager.js";
import { COLORS } from "./constants.js";

// 각 서버별 음악 제어 메시지 ID 저장
const musicMessages = new Map<
  string,
  { channelId: string; messageId: string }
>();

/**
 * 현재 재생 상태를 보여주는 임베드를 생성합니다.
 */
function createMusicEmbed(queue: GuildQueue): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle("🎵 음악 플레이어");

  if (queue.currentTrack) {
    embed.addFields({
      name: "▶️ 현재 재생 중",
      value: `**${queue.currentTrack.title}**\n요청: ${queue.currentTrack.requestedBy}`,
    });
  } else {
    embed.setDescription("재생 중인 곡이 없습니다.");
  }

  if (queue.tracks.length > 0) {
    const queueList = queue.tracks
      .slice(0, 10)
      .map((t, i) => `${i + 1}. ${t.title} [${t.requestedBy}]`)
      .join("\n");

    let queueText = queueList;
    if (queue.tracks.length > 10) {
      queueText += `\n...외 ${queue.tracks.length - 10}곡`;
    }

    embed.addFields({
      name: `📋 대기열 (${queue.tracks.length}곡)`,
      value: queueText,
    });
  }

  embed.setFooter({ text: "버튼으로 음악을 제어하세요" });
  embed.setTimestamp();

  return embed;
}

/**
 * 음악 제어 버튼 Row를 생성합니다.
 */
function createMusicButtons(
  queue: GuildQueue,
): ActionRowBuilder<ButtonBuilder> {
  const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause_resume")
      .setLabel(isPaused ? "재개" : "일시정지")
      .setEmoji(isPaused ? "▶️" : "⏸️")
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("music_skip")
      .setLabel("스킵")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setLabel("정지")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * 대기열에서 삭제할 곡을 선택하는 SelectMenu를 생성합니다.
 */
export function createDeleteSelect(
  queue: GuildQueue,
): ActionRowBuilder<StringSelectMenuBuilder> | null {
  if (queue.tracks.length === 0) return null;

  const options = queue.tracks.slice(0, 25).map((t, i) => ({
    label: t.title.slice(0, 100),
    description: `요청: ${t.requestedBy}`.slice(0, 100),
    value: String(i),
  }));

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("music_delete_select")
      .setPlaceholder("삭제할 곡을 선택하세요")
      .addOptions(options),
  );
}

/**
 * 음악 패널(임베드 + 버튼)을 게시하거나 업데이트합니다.
 */
export async function sendOrUpdateMusicPanel(
  channel: TextChannel,
  queue: GuildQueue,
): Promise<void> {
  const embed = createMusicEmbed(queue);
  const buttons = createMusicButtons(queue);
  const components: any[] = [buttons];

  const existing = musicMessages.get(queue.guildId);

  try {
    if (existing && existing.channelId === channel.id) {
      // 기존 메시지를 업데이트 시도
      const msg = await channel.messages
        .fetch(existing.messageId)
        .catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed], components });
        return;
      }
    }

    // 기존 메시지가 없거나 fetch 실패 시 새 메시지 전송
    const newMsg = await channel.send({ embeds: [embed], components });
    musicMessages.set(queue.guildId, {
      channelId: channel.id,
      messageId: newMsg.id,
    });
  } catch (err) {
    console.error("음악 패널 업데이트 실패:", err);
  }
}

/**
 * 음악 패널을 삭제합니다. (봇 퇴장 시)
 */
export async function deleteMusicPanel(
  channel: TextChannel,
  guildId: string,
): Promise<void> {
  const existing = musicMessages.get(guildId);
  if (!existing) return;

  try {
    const msg = await channel.messages
      .fetch(existing.messageId)
      .catch(() => null);
    if (msg) await msg.delete().catch(() => {});
  } catch {
    // 무시
  }
  musicMessages.delete(guildId);
}

/**
 * 버튼 인터랙션을 처리합니다.
 */
export async function handleMusicButton(
  interaction: ButtonInteraction,
  queue: GuildQueue,
  removeQueue: () => void,
): Promise<void> {
  const channel = interaction.channel as TextChannel;

  if (interaction.replied || interaction.deferred) return;

  const safeDefer = async () => {
    try {
      await interaction.deferUpdate();
    } catch {
      // interaction 만료 (10062) - 무시
    }
  };

  switch (interaction.customId) {
    case "music_pause_resume": {
      const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
      if (isPaused) {
        queue.resume();
      } else {
        queue.pause();
      }
      await safeDefer();
      // UI 업데이트
      await sendOrUpdateMusicPanel(channel, queue);
      break;
    }
    case "music_skip": {
      if (queue.currentTrack) {
        queue.player.stop(); // Idle 이벤트가 발생하여 playNext 호출
        await safeDefer();
      } else {
        await interaction.reply({
          content: "현재 재생 중인 노래가 없습니다.",
          flags: ["Ephemeral"],
        });
      }
      break;
    }
    case "music_stop": {
      await safeDefer();
      await deleteMusicPanel(channel, queue.guildId);
      queue.destroy();
      removeQueue();
      break;
    }
    case "music_delete": {
      const selectRow = createDeleteSelect(queue);
      if (!selectRow) {
        await interaction.reply({
          content: "대기열이 비어있습니다.",
          flags: ["Ephemeral"],
        });
        return;
      }
      await interaction.reply({
        content: "🗑️ 삭제할 곡을 선택하세요:",
        components: [selectRow],
        flags: ["Ephemeral"],
      });
      break;
    }
  }
}

/**
 * SelectMenu 인터랙션을 처리합니다 (곡 삭제).
 */
export async function handleMusicSelect(
  interaction: StringSelectMenuInteraction,
  queue: GuildQueue,
): Promise<void> {
  const channel = interaction.channel as TextChannel;
  const value = interaction.values[0];
  if (value === undefined) {
    await interaction.update({
      content: "선택 오류가 발생했습니다.",
      components: [],
    });
    return;
  }
  const index = parseInt(value, 10);
  const removed = queue.removeTrack(index);

  if (removed) {
    await interaction.update({
      content: `🗑️ **${removed.title}**을(를) 대기열에서 삭제했습니다.`,
      components: [],
    });
    // 메인 패널 업데이트
    await sendOrUpdateMusicPanel(channel, queue);
  } else {
    await interaction.update({
      content: "해당 곡을 찾을 수 없습니다.",
      components: [],
    });
  }
}
