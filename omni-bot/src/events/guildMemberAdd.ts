import {
  Events,
  GuildMember,
  TextChannel,
  AttachmentBuilder,
} from "discord.js";
import { db } from "../firebase.js";
import { generateWelcomeImage } from "../utils/canvas.js";

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    const guildId = member.guild.id;
    let targetChannel: TextChannel | null | undefined =
      member.guild.systemChannel;

    const guildSettingsRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("bot_settings");

    try {
      // 대시보드 상태 먼저 확인
      const featuresDoc = await guildSettingsRef.doc("features").get();
      if (featuresDoc.exists && featuresDoc.data()?.welcomeEnabled === false) {
        return; // 기능이 꺼져있으면 종료
      }

      // Fetch dynamic channel setting from Firebase
      const msgsDoc = await guildSettingsRef.doc("messages").get();
      if (msgsDoc.exists && msgsDoc.data()?.welcomeChannelId) {
        const welcomeChannelId = msgsDoc.data()?.welcomeChannelId;
        const fetchedChannel = await member.guild.channels
          .fetch(welcomeChannelId)
          .catch(() => null);
        if (fetchedChannel && fetchedChannel.isTextBased()) {
          targetChannel = fetchedChannel as TextChannel;
        }
      }
    } catch (e) {
      console.error("Firebase settings error in member add:", e);
    }

    if (!targetChannel) return;

    const nickname = member.nickname ? `(${member.nickname})` : "";
    const displayName = member.user.username;
    const fullUserString = `${displayName}${nickname}`;

    let title = `${fullUserString} 님 어서오세요!`;
    let desc = `당신은 ✨•:*'* 타이랑킹덤 "*:•.✨ 디스코드의 ${member.guild.memberCount}번째 멤버입니다.`;

    try {
      const msgsDoc = await guildSettingsRef.doc("messages").get();
      if (msgsDoc.exists) {
        const data = msgsDoc.data();
        if (data?.welcomeTitle) {
          title = data.welcomeTitle
            .replace(/{user}/g, fullUserString)
            .replace(/{count}/g, member.guild.memberCount.toString());
        }
        if (data?.welcomeDesc) {
          desc = data.welcomeDesc
            .replace(/{user}/g, fullUserString)
            .replace(/{count}/g, member.guild.memberCount.toString());
        }
      }
    } catch (e) {
      console.error("Failed to load custom welcome messages:", e);
    }

    const titleFormatted = title
      .replace("{user}", member.user.displayName)
      .replace("{count}", member.guild.memberCount.toString());
    const descFormatted = desc
      .replace("{user}", member.user.displayName)
      .replace("{count}", member.guild.memberCount.toString());

    const avatarUrl = member.user.displayAvatarURL({
      extension: "png",
      size: 512,
      forceStatic: true,
    });

    try {
      const imageBuffer = await generateWelcomeImage(
        avatarUrl,
        titleFormatted,
        descFormatted,
      );

      if (targetChannel) {
        const attachment = new AttachmentBuilder(imageBuffer, {
          name: "welcome.png",
        });
        await targetChannel.send({
          files: [attachment],
        });
      }
    } catch (e) {
      console.error("Failed to send welcome message with image:", e);
    }
  },
};
