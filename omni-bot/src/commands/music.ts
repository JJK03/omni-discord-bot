import {
  ChatInputCommandInteraction,
  TextChannel,
  GuildMember,
  Guild,
  VoiceBasedChannel,
  Message,
} from "discord.js";
import { getGuildFeatures } from "../index.js";
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
) {
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
          if (feedback.editReply) return feedback.editReply(msg);
          if (feedback.reply) return feedback.reply(msg);
        }
        return;
      }

      if (!repliedDeleted && feedback.deleteReply) await feedback.deleteReply().catch(() => {});
    } else if (isAppleMusic) {
      const msgWait = "⏳ Apple Music에서 곡 정보를 가져오는 중입니다...";
      if (feedback.editReply) await feedback.editReply(msgWait);
      else if (feedback.reply) await feedback.reply(msgWait);

      const trackInfo = await resolveAppleMusicTrack(query, userDisplayName);

      if (!trackInfo) {
        const msgErr = "❌ Apple Music 링크에서 곡을 찾을 수 없습니다.";
        if (feedback.editReply) return feedback.editReply(msgErr);
        if (feedback.reply) return feedback.reply(msgErr);
        return;
      }

      await queue.enqueue(trackInfo);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
    } else if (isYouTubePlaylist) {
      const msgWait = "⏳ 재생목록을 검색하고 있습니다... (곡 수에 따라 시간이 걸릴 수 있습니다)";
      if (feedback.editReply) await feedback.editReply(msgWait);
      else if (feedback.reply) await feedback.reply(msgWait);

      const playlistInfo = await getYouTubePlaylist(query, userDisplayName, queue.abortController.signal);

      if (queue.abortController.signal.aborted) return;
      if (!playlistInfo || playlistInfo.tracks.length === 0) {
        const msgErr = "❌ 재생목록에서 트랙을 가져올 수 없습니다. 비공개 목록이거나 잘못된 주소일 수 있습니다.";
        if (feedback.editReply) return feedback.editReply(msgErr);
        if (feedback.reply) return feedback.reply(msgErr);
        return;
      }

      await queue.enqueueMultiple(playlistInfo.tracks);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
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
          if (feedback.editReply) return feedback.editReply(msgErr);
          if (feedback.reply) return feedback.reply(msgErr);
          return;
        }
        trackInfo = {
          title: searchResult.title,
          url: searchResult.url,
          requestedBy: userDisplayName,
        };
      }

      if (queue.abortController.signal.aborted) return;
      await queue.enqueue(trackInfo);
      if (feedback.deleteReply) await feedback.deleteReply().catch(() => {});
    }
  } catch (err) {
    console.error("음악 재생 실패:", err);
    const msgErr = "노래를 가져오는 중 오류가 발생했습니다.";
    if (feedback.editReply) await feedback.editReply(msgErr);
    else if (feedback.reply) await feedback.reply(msgErr);
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
    const channel = interaction.channel as TextChannel;
    try {
      await db.collection(COLLECTIONS.GUILDS)
        .doc(guildId)
        .collection(COLLECTIONS.BOT_SETTINGS)
        .doc(COLLECTIONS.FEATURES)
        .update({ musicChannelId: channel.id });
      
      return interaction.reply({
        content: `✅ 이 채널(<#${channel.id}>)이 노래 신청 전용 채널로 설정되었습니다. 이제 "/노래" 없이 노래 제목이나 URL만 입력해도 신청됩니다.`,
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

  await handleMusicRequest(
    guild,
    voiceChannel,
    interaction.channel as TextChannel,
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
