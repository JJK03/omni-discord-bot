import {
  ChatInputCommandInteraction,
  TextChannel,
  GuildMember,
  Guild,
  VoiceBasedChannel,
  PermissionsBitField,
  EmbedBuilder,
} from "discord.js";
import { getGuildFeatures } from "../guildState.js";
import { globalVoiceManager } from "../voiceManager.js";
import { searchYouTube, getYouTubePlaylist, resolveAppleMusicTrack, resolveAppleMusicPlaylist } from "../voiceManager.js";
import { sendOrUpdateMusicPanel, deleteMusicPanel } from "../musicUI.js";
import { db } from "../firebase.js";
import { COLLECTIONS } from "../constants.js";

export async function handleMusicRequest(
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  textChannel: TextChannel,
  query: string,
  userDisplayName: string,
  feedback: {
    editReply?: (content: string) => Promise<any>;
    reply?: (content: string) => Promise<any>;
    deleteReply?: () => Promise<any>;
    followUp?: (content: string) => Promise<any>;
  }
): Promise<boolean> {
  try {
    const queue = globalVoiceManager.getQueue(guild.id);

    // 음성 채널 연결
    queue.connect(voiceChannel);

    // 트랙 재생 시작 시 임베드 업데이트 콜백 등록
    queue.onTrackStart = () => {
      sendOrUpdateMusicPanel(textChannel, queue);
    };
    queue.onQueueEnd = () => {
      sendOrUpdateMusicPanel(textChannel, queue);
    };
    queue.onQueueUpdate = () => {
      sendOrUpdateMusicPanel(textChannel, queue);
    };
    // 봇 퇴장/정지 시 자동 패널 삭제 콜백
    queue.onDestroy = () => {
      deleteMusicPanel(textChannel, guild.id);
    };

    // URL인지 검색어인지 판별
    const isUrl = query.startsWith("http");
    const isAppleMusic = isUrl && query.includes("music.apple.com");
    const isAppleMusicPlaylist = isAppleMusic && query.includes("/playlist/");
    const isYouTubePlaylist =
      isUrl && !isAppleMusic && (query.includes("list=") || query.includes("playlist"));

    if (isAppleMusicPlaylist) {
      if (feedback.editReply) await feedback.editReply("⏳ Apple Music 플레이리스트를 가져오는 중입니다...");
      else if (feedback.reply) await feedback.reply("⏳ Apple Music 플레이리스트를 가져오는 중입니다...");

      let repliedDeleted = false;
      const signal = queue.abortController.signal;
      const playlistInfo = await resolveAppleMusicPlaylist(
        query,
        userDisplayName,
        async (tracks, isFirst) => {
          if (signal.aborted) return;
          await queue.enqueueMultiple(tracks);
          if (isFirst && !repliedDeleted && feedback.deleteReply) {
            repliedDeleted = true;
            await feedback.deleteReply().catch(() => {});
          }
        },
        signal,
      );

      if (!playlistInfo || playlistInfo.tracks.length === 0) {
        if (!repliedDeleted) {
          const msg = "❌ Apple Music 플레이리스트를 가져올 수 없습니다. 비공개 목록이거나 잘못된 주소일 수 있습니다.";
          if (feedback.editReply) await feedback.editReply(msg);
          else if (feedback.reply) await feedback.reply(msg);
        }
        return false;
      }

      if (!repliedDeleted && feedback.deleteReply) await feedback.deleteReply().catch(() => {});
      return true;
    } else if (isAppleMusic) {
      const msgWait = "⏳ Apple Music에서 곡 정보를 가져오는 중입니다...";
      if (feedback.editReply) await feedback.editReply(msgWait);
      else if (feedback.reply) await feedback.reply(msgWait);

      const trackInfo = await resolveAppleMusicTrack(query, userDisplayName);

      if (!trackInfo) {
        const msgErr = "❌ Apple Music 링크에서 곡을 찾을 수 없습니다.";
        if (feedback.editReply) await feedback.editReply(msgErr);
        else if (feedback.reply) await feedback.reply(msgErr);
        return false;
      }

      await queue.enqueue(trackInfo);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
      return true;
    } else if (isYouTubePlaylist) {
      const msgWait = "⏳ 재생목록을 검색하고 있습니다... (곡 수에 따라 시간이 걸릴 수 있습니다)";
      if (feedback.editReply) await feedback.editReply(msgWait);
      else if (feedback.reply) await feedback.reply(msgWait);

      const playlistInfo = await getYouTubePlaylist(query, userDisplayName, queue.abortController.signal);

      if (queue.abortController.signal.aborted) return false;
      if (!playlistInfo || playlistInfo.tracks.length === 0) {
        const msgErr = "❌ 재생목록에서 트랙을 가져올 수 없습니다. 비공개 목록이거나 잘못된 주소일 수 있습니다.";
        if (feedback.editReply) await feedback.editReply(msgErr);
        else if (feedback.reply) await feedback.reply(msgErr);
        return false;
      }

      await queue.enqueueMultiple(playlistInfo.tracks);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
      return true;
    } else {
      let trackInfo: { title: string; url: string; requestedBy: string };

      if (isUrl) {
        trackInfo = {
          title: query,
          url: query,
          requestedBy: userDisplayName,
        };
      } else {
        const searchResult = await searchYouTube(query);
        if (!searchResult) {
          const msgErr = "🔍 노래를 찾을 수 없습니다.";
          if (feedback.editReply) await feedback.editReply(msgErr);
          else if (feedback.reply) await feedback.reply(msgErr);
          return false;
        }
        trackInfo = {
          title: searchResult.title,
          url: searchResult.url,
          requestedBy: userDisplayName,
        };
      }

      if (queue.abortController.signal.aborted) return false;
      await queue.enqueue(trackInfo);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
      return true;
    }
  } catch (err) {
    console.error("음악 재생 실패:", err);
    const msgErr = "노래를 가져오는 중 오류가 발생했습니다.";
    if (feedback.editReply) await feedback.editReply(msgErr);
    else if (feedback.reply) await feedback.reply(msgErr);
    return false;
  }
}

export async function executeMusic(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId ?? "";
  const features = getGuildFeatures(guildId);
  
  if (!features.music) {
    return interaction.reply({
      content: "⚠️ 현재 노래 재생 기능은 대시보드에서 비활성화되어 있습니다.",
      flags: ["Ephemeral"],
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "채널설정") {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        content: "❌ 채널 설정을 변경할 권한(채널 관리)이 없습니다.",
        flags: ["Ephemeral"],
      });
    }

    const newChannel = interaction.channel as TextChannel;
    const featuresRef = db.collection(COLLECTIONS.GUILDS)
      .doc(guildId)
      .collection(COLLECTIONS.BOT_SETTINGS)
      .doc(COLLECTIONS.FEATURES);

    try {
      // 기존 채널/안내 메시지 정보를 update 전에 읽기
      const prevFeatures = getGuildFeatures(guildId);
      const prevChannelId = prevFeatures.musicChannelId;
      const prevMsgId = prevFeatures.musicAnnouncementMessageId;

      // 이전 안내 메시지 삭제 (채널이 바뀌거나 메시지가 있을 때)
      if (prevChannelId && prevMsgId) {
        try {
          const prevChannel = await interaction.client.channels.fetch(prevChannelId).catch(() => null) as TextChannel | null;
          if (prevChannel) {
            const prevMsg = await prevChannel.messages.fetch(prevMsgId).catch(() => null);
            if (prevMsg) await prevMsg.delete().catch(() => {});
          }
        } catch {
          // 채널이나 메시지가 이미 없어도 계속 진행
        }
      }

      // 새 채널에 안내 임베드 전송
      const announceEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎵 노래 신청 전용 채널")
        .setDescription(
          "이 채널은 노래 신청 전용 채널입니다.\n\n" +
          "**사용 방법**\n" +
          "• 노래 제목 또는 YouTube/Apple Music URL을 채팅에 입력\n" +
          "• `/노래 신청` 명령어로도 신청 가능\n\n" +
          "**주의사항**\n" +
          "• 음성 채널에 입장한 상태에서 신청해야 합니다\n" +
          "• 신청 메시지는 자동으로 삭제됩니다"
        )
        .setFooter({ text: "omni-bot • 노래 신청 채널" })
        .setTimestamp();

      const announceMsgResult = await newChannel.send({ embeds: [announceEmbed] });

      // 핀 시도 (봇 권한 부족 시 임베드는 유지하되 핀만 스킵)
      await announceMsgResult.pin().catch(() => {});

      // Firestore 업데이트
      await featuresRef.update({
        musicChannelId: newChannel.id,
        musicAnnouncementMessageId: announceMsgResult.id,
      });

      return interaction.reply({
        content: `✅ <#${newChannel.id}> 채널이 노래 신청 전용 채널로 설정되었습니다.`,
        flags: ["Ephemeral"],
      });
    } catch (error) {
      console.error("Music channel setting error:", error);
      return interaction.reply({
        content: "❌ 채널 설정 중 오류가 발생했습니다.",
        flags: ["Ephemeral"],
      });
    }
  }

  // '신청' 서브커맨드 처리
  if (!features.musicChannelId) {
    return interaction.reply({
      content: "❌ 먼저 `/노래 채널설정`으로 노래 신청 전용 채널을 지정해주세요.",
      flags: ["Ephemeral"],
    });
  }

  const query = interaction.options.getString("검색어", true);
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return interaction.reply({
      content: "🔇 먼저 음성 채널에 접속해야 합니다.",
      flags: ["Ephemeral"],
    });
  }

  if (interaction.replied || interaction.deferred) return;

  try {
    await interaction.deferReply({ flags: ["Ephemeral"] });
  } catch {
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  // 설정된 전용 채널로 패널 전송 (명령어를 어느 채널에서 보내든 관계없이)
  const musicChannel = await interaction.client.channels.fetch(features.musicChannelId).catch(() => null) as TextChannel | null;
  if (!musicChannel) {
    return interaction.editReply("❌ 설정된 노래 채널을 찾을 수 없습니다. `/노래 채널설정`으로 다시 지정해주세요.");
  }

  await handleMusicRequest(
    guild,
    voiceChannel,
    musicChannel,
    query,
    member.displayName,
    {
      editReply: (content) => interaction.editReply(content),
      reply: (content) => interaction.reply(content),
      deleteReply: () => interaction.deleteReply(),
      followUp: (content) => interaction.followUp(content),
    }
  );
}
