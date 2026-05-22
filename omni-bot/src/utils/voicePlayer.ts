import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType,
} from "@discordjs/voice";
import { VoiceChannel, StageChannel } from "discord.js";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

export class SimpleVoicePlayer {
  private player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 50,
    },
  });

  constructor() {
    this.player.on("error", (error) => {
      console.error("[Voice:Error] Audio Player Error:", error.message);
    });
  }

  public async playCountdown(
    voiceChannel: VoiceChannel | StageChannel,
    onStep?: (step: number) => void,
  ) {
    console.log(
      `[Voice:Rhythm] 인간적인 박자 카운트다운 시작: ${voiceChannel.name}`,
    );

    const systemFFmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
      selfDeaf: false,
      selfMute: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 5000);
      connection.subscribe(this.player);

      const assetsPath = path.join(process.cwd(), "assets", "audio");

      // 인간적인 리듬을 2배 속도로 압축 (wait 시간 절반 단축)
      const playlist = [
        { file: "one.mp3", step: 3, wait: 550 }, // 하나~ (배속)
        { file: "two.mp3", step: 2, wait: 550 }, // 둘~ (배속)
        { file: "three.mp3", step: 1, wait: 400 }, // 셋! (임팩트 배속)
      ];

      for (const item of playlist) {
        const filePath = path.join(assetsPath, item.file);
        if (!fs.existsSync(filePath)) continue;

        if (onStep) onStep(item.step);

        const ffmpegProcess = spawn(systemFFmpeg as string, [
          "-i",
          filePath,
          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "pipe:1",
        ]);

        const resource = createAudioResource(ffmpegProcess.stdout, {
          inputType: StreamType.Raw,
        });

        this.player.play(resource);

        // 즉각 재생 시작 대기 (더욱 단축)
        await entersState(this.player, AudioPlayerStatus.Playing, 200).catch(
          () => {},
        );

        // 설정된 박자만큼 대기 (2배 압축된 리듬)
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, item.wait);
          this.player.once(AudioPlayerStatus.Idle, () => {
            clearTimeout(timeout);
            resolve(true);
          });
        });

        if (ffmpegProcess) ffmpegProcess.kill();
        // 호흡 간격도 절반으로 단축 (50ms)
        await new Promise((r) => setTimeout(r, 50));
      }

      console.log("[Voice:Rhythm] 리듬 카운트다운 종료");
      // 자동 퇴장 제거: 사용자가 직접 '퇴장' 버튼을 누르기 전까지 대기
    } catch (error) {
      console.error("[Voice:Rhythm] 에러 발생:", error);
      connection.destroy();
      throw error;
    }
  }

  /**
   * 명시적으로 보이스 채널에서 연결을 해제합니다.
   */
  public async disconnect(guildId: string) {
    const { getVoiceConnection } = await import("@discordjs/voice");
    const connection = getVoiceConnection(guildId);
    if (connection) {
      connection.destroy();
      console.log(`[Voice] ${guildId} 서버에서 연결 해제됨`);
    }
  }
}
