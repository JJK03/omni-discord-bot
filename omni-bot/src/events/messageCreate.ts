import { Events, Message, TextChannel, GuildMember } from "discord.js";
import emojiRegex from "emoji-regex";
import { getGuildFeatures } from "../guildState.js";
import { handleMusicRequest } from "../commands/music.js";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const features = getGuildFeatures(guildId);
    const content = message.content.trim();

    // 노래 신청 전용 채널 처리
    if (features.music && features.musicChannelId === message.channelId && content) {
      const member = message.member as GuildMember;
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        const reply = await message.reply("🔇 먼저 음성 채널에 접속해야 합니다.");
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        // 채널 유지를 위해 잘못된 입력도 일단 삭제할지 고민되지만, 피드백을 위해 남겨두거나 명확히 삭제
        await message.delete().catch(() => {});
        return;
      }

      // 노래 신청 로직 실행
      const success = await handleMusicRequest(
        message.guild,
        voiceChannel,
        message.channel as TextChannel,
        content,
        member.displayName,
        {
          reply: async (msg) => {
            const r = await message.reply(msg);
            setTimeout(() => r.delete().catch(() => {}), 10000);
            return r;
          }
        }
      );

      // 보낸 메시지 삭제 (신청 성공 시에만 채널을 깔끔하게 유지)
      if (success) {
        await message.delete().catch(() => {});
      }
      return;
    }

    // 1) 커스텀 이모지 감지 정규식 (<:name:id> 또는 <a:name:id>)
    const customEmojiRegex = /^<a?:([^:]+):(\d+)>$/i;
    const customMatch = content.match(customEmojiRegex);

    // 2) 일반 유니코드 이모지 하나만 있는지 확인
    const unicodeRegex = emojiRegex();
    const matches = Array.from(content.matchAll(unicodeRegex));

    // 일반 유니코드 이모지가 하나만 존재하고 나머지 문자열이 아예 없을 때
    const isSingleUnicodeEmoji =
      matches.length === 1 && matches[0]?.[0] === content;

    if (customMatch || isSingleUnicodeEmoji) {
      let emojiUrl = "";

      if (customMatch) {
        // 커스텀 이모지일 경우 확장
        const isAnimated = content.startsWith("<a:");
        const emojiId = customMatch[2];
        const extension = isAnimated ? "gif" : "png";
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=256`;
      } else if (isSingleUnicodeEmoji) {
        // 일반 이모지일 경우 Twemoji 리소스를 활용하여 SVG 주소로 변환
        // 코드포인트를 Twemoji URL 형식으로 파싱
        const codePoint = [...content]
          .map((char) => char.codePointAt(0)?.toString(16))
          .join("-");

        // 주의: 조합된 이모지(예: 👨‍👩‍👧‍👦) 등은 복잡한 처리가 필요할 수 있으나 대부분의 기본 이모지는 파싱됩니다.
        // 좀 더 안정적인 변환을 위해 '-fe0f' 같은 변형자 코드 포인트를 제거하는 방식도 고려할 수 있습니다.
        const cleanCodePoint = codePoint.replace(/-fe0f/g, "");
        // Twemoji SVG/PNG assets format base.
        emojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cleanCodePoint}.png`;
      }

      try {
        const channel = message.channel as TextChannel;
        // 웹훅을 찾거나 없으면 생성!
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find((wh) => wh.token);

        if (!webhook) {
          webhook = await channel.createWebhook({
            name: "OmniWebhook",
            avatar: message.client.user?.displayAvatarURL(),
          });
        }

        const nickname = message.member?.nickname;
        const username = message.author.displayName || message.author.username;
        const displayName = nickname ? nickname : username;

        // 원본 유저 프로필로 이모지 이미지(URL) 전송
        await webhook.send({
          content: emojiUrl,
          username: displayName,
          avatarURL: message.author.displayAvatarURL({ size: 128 }),
        });

        // 사용자가 보낸 원래 작은 이모지 메시지 삭제 (이미 삭제된 경우 무시)
        await message.delete().catch(() => {});
      } catch (error) {
        console.error("이모지 처리 중 오류 발생:", error);
      }
    }
  },
};
