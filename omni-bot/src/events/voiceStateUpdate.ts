import { Events, VoiceState } from "discord.js";
import { globalVoiceManager } from "../voiceManager.js";

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const guildId = oldState.guild.id;
    const queue = globalVoiceManager.getQueue(guildId);

    // 봇이 음성 채널에 연결되어 있지 않으면 무시
    if (!queue.connection) return;

    // 만약 어떤 유저가 음성 채널을 이동/퇴장했다면
    if (oldState.channelId) {
      const botVoiceChannelId = oldState.guild.members.me?.voice.channelId;

      // 유저가 나간 채널이 봇이 현재 있는 채널인 경우
      if (oldState.channelId === botVoiceChannelId) {
        queue.checkAutoLeave();
      }
    }
  },
};
