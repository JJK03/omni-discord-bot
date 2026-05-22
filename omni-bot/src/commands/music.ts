import {
  ChatInputCommandInteraction,
  TextChannel,
  GuildMember,
} from "discord.js";
import { getGuildFeatures } from "../index.js";
import { globalVoiceManager } from "../voiceManager.js";
import { searchYouTube, getYouTubePlaylist, resolveAppleMusicTrack, resolveAppleMusicPlaylist } from "../voiceManager.js";
import { sendOrUpdateMusicPanel, deleteMusicPanel } from "../musicUI.js";

export async function executeMusic(interaction: ChatInputCommandInteraction) {
  if (!getGuildFeatures(interaction.guildId ?? "").music) {
    return interaction.reply({
      content: "⚠️ 현재 노래 재생 기능은 대시보드에서 비활성화되어 있습니다.",
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
    return; // interaction 만료 (10062) - 무시
  }

  try {
    const guild = interaction.guild;
    if (!guild) return;

    const queue = globalVoiceManager.getQueue(guild.id);
    const textChannel = interaction.channel as TextChannel;

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
      deleteMusicPanel(textChannel, queue.guildId);
    };

    // URL인지 검색어인지 판별
    const isUrl = query.startsWith("http");
    const isAppleMusic = isUrl && query.includes("music.apple.com");
    const isAppleMusicPlaylist = isAppleMusic && query.includes("/playlist/");
    const isYouTubePlaylist =
      isUrl && !isAppleMusic && (query.includes("list=") || query.includes("playlist"));

    // 서버 닉네임 사용
    const displayName = member.displayName;

    if (isAppleMusicPlaylist) {
      await interaction.editReply(
        "⏳ Apple Music 플레이리스트를 가져오는 중입니다...",
      );

      let repliedDeleted = false;
      const playlistInfo = await resolveAppleMusicPlaylist(
        query,
        displayName,
        async (tracks, isFirst) => {
          await queue.enqueueMultiple(tracks);
          if (isFirst && !repliedDeleted) {
            repliedDeleted = true;
            await interaction.deleteReply().catch(() => {});
          }
        },
      );

      if (!playlistInfo || playlistInfo.tracks.length === 0) {
        if (!repliedDeleted) {
          return interaction.editReply(
            "❌ Apple Music 플레이리스트를 가져올 수 없습니다. 비공개 목록이거나 잘못된 주소일 수 있습니다.",
          );
        }
        return;
      }

      if (!repliedDeleted) await interaction.deleteReply().catch(() => {});
    } else if (isAppleMusic) {
      await interaction.editReply("⏳ Apple Music에서 곡 정보를 가져오는 중입니다...");

      const trackInfo = await resolveAppleMusicTrack(query, displayName);

      if (!trackInfo) {
        return interaction.editReply("❌ Apple Music 링크에서 곡을 찾을 수 없습니다.");
      }

      await queue.enqueue(trackInfo);
      await interaction.deleteReply();
    } else if (isYouTubePlaylist) {
      await interaction.editReply(
        "⏳ 재생목록을 검색하고 있습니다... (곡 수에 따라 시간이 걸릴 수 있습니다)",
      );

      const playlistInfo = await getYouTubePlaylist(query, displayName);

      if (!playlistInfo || playlistInfo.tracks.length === 0) {
        return interaction.editReply(
          "❌ 재생목록에서 트랙을 가져올 수 없습니다. 비공개 목록이거나 잘못된 주소일 수 있습니다.",
        );
      }

      await queue.enqueueMultiple(playlistInfo.tracks);
      await interaction.deleteReply();
    } else {
      let trackInfo: { title: string; url: string; requestedBy: string };

      if (isUrl) {
        trackInfo = {
          title: query,
          url: query,
          requestedBy: displayName,
        };
      } else {
        const searchResult = await searchYouTube(query);
        if (!searchResult) {
          return interaction.editReply("🔍 노래를 찾을 수 없습니다.");
        }
        trackInfo = {
          title: searchResult.title,
          url: searchResult.url,
          requestedBy: displayName,
        };
      }

      await queue.enqueue(trackInfo);
      await interaction.deleteReply();
    }
  } catch (err) {
    console.error("음악 재생 실패:", err);
    await interaction.editReply("노래를 가져오는 중 오류가 발생했습니다.");
  }
}
