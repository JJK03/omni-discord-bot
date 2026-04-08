import {
  Events,
  GuildMember,
  TextChannel,
  AttachmentBuilder,
} from "discord.js";
import { db } from "../firebase.js";
import { generateWelcomeImage } from "../utils/canvas.js";

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember) {
    console.log(
      `[GuildMemberRemove] Fired for ${member.user.tag} (ID: ${member.user.id})`,
    );

    let targetChannel: TextChannel | null | undefined =
      member.guild.systemChannel;
    let title = "{user} 님이 서버를 떠났습니다...😥";
    let desc =
      "현재 ✨•:*'* 타이랑킹덤 \"*:•.✨ 서버의 멤버 수는 {count}명입니다.";

    const guildId = member.guild.id;
    const guildSettingsRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("bot_settings");

    try {
      // 대시보드 상태 먼저 확인
      const featuresDoc = await guildSettingsRef.doc("features").get();
      if (featuresDoc.exists && featuresDoc.data()?.leaveEnabled === false) {
        console.log(
          `[GuildMemberRemove] Feature disabled in dashboard. Exiting.`,
        );
        return; // 기능이 꺼져있으면 종료
      }

      // Fetch dynamic channel setting from Firebase
      const msgsDoc = await guildSettingsRef.doc("messages").get();
      if (msgsDoc.exists) {
        const data = msgsDoc.data();
        if (data?.leaveChannelId) {
          const fetchedChannel = await member.guild.channels
            .fetch(data.leaveChannelId)
            .catch(() => null);
          if (fetchedChannel && fetchedChannel.isTextBased()) {
            targetChannel = fetchedChannel as TextChannel;
            console.log(
              `[GuildMemberRemove] Fetched custom channel: ${targetChannel.id}`,
            );
          } else {
            console.log(
              `[GuildMemberRemove] Could not resolve custom channel: ${data.leaveChannelId}`,
            );
          }
        }

        // Update title and description if custom messages are found
        const fullUserString = `${member.user.displayName}(${member.user.username})`;
        if (data?.leaveTitle) {
          title = data.leaveTitle
            .replace(/{user}/g, fullUserString)
            .replace(/{count}/g, member.guild.memberCount.toString());
        }
        if (data?.leaveDesc) {
          desc = data.leaveDesc
            .replace(/{user}/g, fullUserString)
            .replace(/{count}/g, member.guild.memberCount.toString());
        }
      }
    } catch (e) {
      console.error("Firebase settings error in member remove:", e);
    }

    if (!targetChannel) {
      console.log(
        `[GuildMemberRemove] No target channel found (systemChannel is null/undefined? ${!member.guild.systemChannel}). Exiting.`,
      );
      return;
    }

    console.log(
      `[GuildMemberRemove] Proceeding to generate image for channel ${targetChannel.name}...`,
    );
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
          name: "leave.png",
        });
        await targetChannel.send({
          files: [attachment],
        });
      }
    } catch (e) {
      console.error("Failed to send leave message with image:", e);
    }
  },
};
