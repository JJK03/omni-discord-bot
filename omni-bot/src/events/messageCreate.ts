import { Events, Message, TextChannel } from "discord.js";
import emojiRegex from "emoji-regex";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;

    const content = message.content.trim();

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
