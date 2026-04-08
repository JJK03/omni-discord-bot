import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  StreamType,
} from "@discordjs/voice";
import { VoiceChannel, StageChannel } from "discord.js";
import { spawn, execFile } from "node:child_process";
import { createRequire } from "node:module";

import ffmpegPath from "ffmpeg-static";

// yt-dlp 바이너리 경로
const require = createRequire(import.meta.url);
const YTDL_BIN = "yt-dlp"; // Homebrew로 설치된 시스템 yt-dlp 사용

export interface Track {
  title: string;
  url: string;
  requestedBy: string;
}

export class GuildQueue {
  public guildId: string;
  public connection: VoiceConnection | null = null;
  public player: AudioPlayer;
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  // 트랙 시작/종료 시 외부 콜백 (임베드 업데이트용)
  public onTrackStart: ((track: Track) => void) | null = null;
  public onQueueEnd: (() => void) | null = null;
  public onQueueUpdate: (() => void) | null = null;
  // 봇 퇴장/정지 시 패널 삭제용 콜백
  public onDestroy: (() => void) | null = null;

  // 현재 실행 중인 자식 프로세스 참조 (스킵/정지 시 안전 정리용)
  private _ytdlpProcess: ReturnType<typeof spawn> | null = null;
  private _ffmpegProcess: ReturnType<typeof spawn> | null = null;

  // 자동 퇴장용 타이머
  private _disconnectTimeout: NodeJS.Timeout | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();

    // 플레이어 에러 핸들링
    this.player.on("error", (error) => {
      console.error(
        `오디오 에러: ${error.message} (리소스: ${(error.resource as any)?.metadata?.title})`,
      );
      this.playNext();
    });

    // 음악이 끝나면 다음 곡 재생
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.currentTrack = null;
      this._killChildProcesses();
      if (this.tracks.length === 0) {
        this.onQueueEnd?.();
        // 대기열이 비었으므로 자동 퇴장 타이머 시작
        this._startDisconnectTimer();
      }
      this.playNext();
    });
  }

  /**
   * 자동 퇴장 타이머를 시작합니다 (5분).
   */
  private _startDisconnectTimer() {
    this._stopDisconnectTimer();
    console.log(
      `[Voice] ${this.guildId} 서버: 활동 없음 감지. 5분 후 자동 퇴장 예약.`,
    );
    this._disconnectTimeout = setTimeout(
      () => {
        console.log(
          `[Voice] ${this.guildId} 서버: 5분간 미활동으로 인한 자동 퇴장.`,
        );
        this.destroy();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * 자동 퇴장 타이머를 중지합니다.
   */
  private _stopDisconnectTimer() {
    if (this._disconnectTimeout) {
      clearTimeout(this._disconnectTimeout);
      this._disconnectTimeout = null;
    }
  }

  /**
   * 재생을 일시정지합니다.
   */
  public pause(): boolean {
    // 일시정지 시에는 자동 퇴장 타이머를 작동시키지 않음 (사용자 요청 사항)
    this._stopDisconnectTimer();
    return this.player.pause();
  }

  /**
   * 재생을 재개합니다.
   */
  public resume(): boolean {
    return this.player.unpause();
  }

  /**
   * 현재 실행 중인 ffmpeg 자식 프로세스를 안전하게 종료합니다.
   */
  private _killChildProcesses() {
    if (this._ffmpegProcess) {
      try {
        this._ffmpegProcess.kill("SIGKILL");
      } catch {}
      this._ffmpegProcess = null;
    }
    // yt-dlp는 이제 URL 추출 후 즉시 종료되므로 메인 루프에서 관리할 필요가 거의 없으나 안전하게 처리
    if (this._ytdlpProcess) {
      try {
        this._ytdlpProcess.kill("SIGKILL");
      } catch {}
      this._ytdlpProcess = null;
    }
  }

  /**
   * yt-dlp를 사용하여 스트리밍 가능한 직접 URL을 추출합니다.
   * 간헐적인 IP 차단 및 추출 실패에 대비해 재시도 로직을 포함합니다.
   */
  private async _getDirectUrl(
    url: string,
    retries = 2,
  ): Promise<string | null> {
    const attempt = async (): Promise<string | null> => {
      return new Promise((resolve, reject) => {
        execFile(
          YTDL_BIN,
          [
            url,
            "-f",
            "bestaudio",
            "--get-url",
            "--no-warnings",
            "--force-ipv4", // IPv6 우선순위로 인한 접속 지연 방지
            "--geo-bypass",
            "--no-playlist",
            "--rm-cache-dir", // 캐시 무효화로 인한 일시적 오류 리셋
            "--user-agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ],
          (error, stdout, stderr) => {
            if (error) {
              console.error("URL 추출 실패 (stderr):", stderr || error.message);
              return reject(error);
            }
            const cleanUrl = stdout.trim();
            if (!cleanUrl) {
              return reject(new Error("추출된 URL이 비어 있습니다."));
            }
            resolve(cleanUrl);
          },
        );
      });
    };

    let lastError = null;
    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          console.log(`[Voice] URL 추출 재시도 중... (${i}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5초 대기 후 재시도
        }
        const streamUrl = await attempt();
        if (streamUrl) return streamUrl;
      } catch (err) {
        lastError = err;
      }
    }

    console.error("최종 URL 추출 실패:", lastError);
    return null;
  }

  /**
   * 사용자의 음성 채널에 연결합니다.
   */
  public connect(channel: VoiceChannel | StageChannel) {
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true, // 다른 유저 오디오 수신 차단 (대역폭/CPU 절감)
      selfMute: false,
    });

    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, 5_000)),
          new Promise((resolve) =>
            this.connection?.once(VoiceConnectionStatus.Signalling, resolve),
          ),
        ]);
      } catch (error) {
        this.destroy();
      }
    });
  }

  /**
   * 채널에 사람이 아무도 없으면 자동 퇴장합니다.
   */
  public checkAutoLeave() {
    if (!this.connection || !this.connection.joinConfig.channelId) return;

    const guild = globalVoiceManager.getClient()?.guilds.cache.get(this.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(this.connection.joinConfig.channelId);
    if (channel?.isVoiceBased()) {
      const members = channel.members.filter((member) => !member.user.bot);
      if (members.size === 0) {
        console.log(`[Auto-Leave] ${this.guildId} 서버: 봇 혼자 남아 자동 퇴장합니다.`);
        this.destroy();
      }
    }
  }

  /**
   * 오디오 재생을 완전히 종료하고 커넥션을 초기화합니다.
   */
  public async destroy() {
    this._stopDisconnectTimer();
    this.tracks = [];
    this.currentTrack = null;
    this._killChildProcesses();
    this.player.stop();
    if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection.destroy();
    }
    this.connection = null;
    // 전역 맵에서 자신을 제거
    globalVoiceManager.removeQueue(this.guildId);
    // 패널 삭제 콜백 호출 (비동기 처리)
    if (this.onDestroy) {
      await (this.onDestroy as any)();
    }
  }

  /**
   * 음악 트랙을 큐에 추가하고 재생을 시작합니다.
   */
  public async enqueue(track: Track) {
    this._stopDisconnectTimer();
    this.tracks.push(track);
    this.onQueueUpdate?.();
    if (this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
  }

  /**
   * 여러 개의 음악 트랙을 큐에 한 번에 추가하고 재생을 시작합니다.
   */
  public async enqueueMultiple(newTracks: Track[]) {
    if (newTracks.length === 0) return;
    this._stopDisconnectTimer();
    this.tracks.push(...newTracks);
    this.onQueueUpdate?.();
    if (this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
  }

  /**
   * 대기열에서 특정 인덱스의 트랙을 삭제합니다.
   */
  public removeTrack(index: number): Track | null {
    if (index < 0 || index >= this.tracks.length) return null;
    const removed = this.tracks.splice(index, 1);
    return removed.length > 0 ? removed[0]! : null;
  }

  /**
   * 큐에 있는 다음 음악을 재생합니다.
   * [성능 최적화 버전] ffmpeg 단일 프로세스가 URL에서 직접 스트리밍하여 CPU 부하를 최소화합니다.
   */
  public async playNext() {
    if (this.tracks.length === 0) {
      return;
    }

    // 재생 시작 시 타이머 중지
    this._stopDisconnectTimer();

    // 이전 프로세스 정리
    this._killChildProcesses();

    const track = this.tracks.shift()!;
    this.currentTrack = track;

    try {
      // 1단계: 직접 스트리밍 URL 추출 (빠른 실행 후 종료)
      const streamUrl = await this._getDirectUrl(track.url);
      if (!streamUrl) {
        throw new Error("스트리밍 URL을 가져올 수 없습니다.");
      }

      // 2단계: ffmpeg 고성능 파이프라인
      if (!ffmpegPath) {
        throw new Error("FFmpeg 바이너리를 찾을 수 없습니다 (ffmpeg-static error).");
      }

      const ffmpeg = spawn(ffmpegPath, [
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-reconnect_at_eof",
        "1",
        "-i",
        streamUrl,
        "-vn", // 비디오 스트림 무시
        "-sn", // 자막 스트림 무시
        "-dn", // 데이터 스트림 무시
        "-analyzeduration",
        "1000000", // 1초간 분석 (더 정확한 포맷 탐지)
        "-probesize",
        "1000000",
        "-loglevel",
        "info",
        "-stats",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-af",
        "volume=0.5",
        "pipe:1",
      ]) as any;
      this._ffmpegProcess = ffmpeg;

      // 에러 및 성능 모니터링 로깅
      ffmpeg.on("error", (err: any) =>
        console.error(
          "[Audio:Error] FFmpeg 프로세스 치명적 에러:",
          err.message,
        ),
      );

      ffmpeg.stderr.on("data", (data: Buffer) => {
        const line = data.toString();

        // 비정상(speed < 1.0x) 시에만 경고 로그 출력
        // 일시정지 상태일 때는 출력이 멈추므로 경고를 무시합니다.
        if (
          line.includes("speed=") &&
          this.player.state.status !== AudioPlayerStatus.Paused
        ) {
          const speedMatch = line.match(/speed=\s*([0-9.]+)x/);
          if (speedMatch && speedMatch[1]) {
            const speed = parseFloat(speedMatch[1]);
            if (!isNaN(speed) && speed < 1.0) {
              console.warn(
                `[Audio:Warning] 서버 성능 저하 감지 (${speed}x) - 버퍼링 가능성 높음`,
              );
            }
          }
        }
      });

      ffmpeg.stdout.on("error", () => {});
      ffmpeg.stdout.on("pause", () => {
        // console.log(
        //   "[Audio:System] 스트림 출력 일시 정지 (디스코드 전송 완료 대기)",
        // );
      });
      ffmpeg.stdout.on("resume", () => {
        // console.log("[Audio:System] 스트림 출력 재개");
      });

      // ffmpeg stdout을 discordjs/voice AudioResource로 변환 (Raw PCM 타입 지정)
      const resource = createAudioResource(ffmpeg.stdout as any, {
        inputType: StreamType.Raw,
        inlineVolume: false,
      });

      // 데이터 공급 지연(Underflow) 감지 훅
      ffmpeg.stdout.on("end", () => {
        console.log("[Audio:Event] 스트림 정상 종료");
      });

      // 안정적인 전송을 위한 입출력 버퍼 최적화
      if ((ffmpeg.stdout as any)._readableState) {
        (ffmpeg.stdout as any)._readableState.highWaterMark = 512 * 1024;
      }

      this.player.play(resource);
      console.log(
        `[Audio:Event] '${track.title}' 재생 시작 (안정성 모니터링 활성화)`,
      );
      this.onTrackStart?.(track);
    } catch (err) {
      console.error("음악 재생 실패:", err);
      // 실패 시 잠시 대기 후 다음 곡 시도 (무한 루프 방지)
      setTimeout(() => this.playNext(), 1000);
    }
  }
}

/**
 * yt-dlp를 이용한 YouTube 검색 헬퍼 함수
 * 시스템에 설치된 yt-dlp 바이너리를 직접 호출 (Python 버전 호환성 문제 방지)
 */
export async function searchYouTube(
  query: string,
): Promise<{ title: string; url: string } | null> {
  return new Promise((resolve) => {
    // query에 대한 기본 검증 및 필터링: shell injection 방지 및 안전한 문자열만 허용
    // 영문, 숫자, 한글, 공백 및 기타 안전한 기호만 허용 (파이프, 세미콜론, 백틱 거부)
    // 선행 대시(-) 필터링 추가 (옵션 오인 방지)
    const sanitizedQuery = query
      .replace(/[|;&$`\n\r"']/g, " ")
      .replace(/^-+/, "")
      .trim();
    if (!sanitizedQuery) {
      console.error("유효하지 않은 검색어입니다.");
      return resolve(null);
    }

    execFile(
      YTDL_BIN,
      [
        `ytsearch1:${sanitizedQuery}`,
        "--dump-single-json",
        "--no-warnings",
        "--no-call-home",
        "--skip-download",
        "--flat-playlist",
      ],
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("YouTube 검색 실패:", error.message);
          if (stderr) console.error("yt-dlp stderr:", stderr);
          return resolve(null);
        }

        try {
          const result = JSON.parse(stdout);
          if (result && result.webpage_url) {
            resolve({
              title: result.title || "알 수 없는 곡",
              url: result.webpage_url,
            });
          } else {
            resolve(null);
          }
        } catch (parseErr) {
          console.error("YouTube 검색 결과 파싱 실패:", parseErr);
          resolve(null);
        }
      },
    );
  });
}

/**
 * yt-dlp를 이용해 YouTube 재생목록에서 트랙 정보들을 한 번에 추출합니다.
 */
export async function getYouTubePlaylist(
  playlistUrl: string,
  requestedBy: string,
): Promise<{ playlistTitle: string; tracks: Track[] } | null> {
  return new Promise((resolve) => {
    // 안전한 웹 URL 여부 검증 (http/https로 시작하고 묶음 기호 등을 포함하지 않는지)
    try {
      const parsedUrl = new URL(playlistUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        console.error("유효하지 않은 프로토콜입니다.");
        return resolve(null);
      }
    } catch (err) {
      console.error("유효하지 않은 URL 형식입니다.", err);
      return resolve(null);
    }

    // --dump-single-json 은 root 객체에 playlist 정보와 entries 배열을 담아줍니다.
    execFile(
      YTDL_BIN,
      [
        playlistUrl,
        "--dump-single-json",
        "--no-warnings",
        "--no-call-home",
        "--skip-download",
        "--flat-playlist",
      ],
      { maxBuffer: 1024 * 1024 * 50 }, // 매우 커질 수 있으므로 버퍼 증가 (50MB)
      (error, stdout, stderr) => {
        if (error) {
          console.error("YouTube 플레이리스트 추출 실패:", error.message);
          if (stderr) console.error("yt-dlp stderr:", stderr);
          return resolve(null);
        }

        try {
          const result = JSON.parse(stdout);
          const playlistTitle = result.title || "알 수 없는 재생목록";
          const entries = result.entries || [];

          const tracks: Track[] = [];

          for (const entry of entries) {
            if (!entry) continue;
            // flat-playlist 일 경우 url 필드에 해당 동영상 주소가 있거나 webpage_url 필드에 존재함
            const videoUrl = entry.url || entry.webpage_url;
            if (videoUrl) {
              tracks.push({
                title: entry.title || "알 수 없는 곡",
                url: videoUrl,
                requestedBy,
              });
            }
          }

          if (tracks.length > 0) {
            resolve({ playlistTitle, tracks });
          } else {
            resolve(null);
          }
        } catch (parseErr) {
          console.error("YouTube 플레이리스트 JSON 파싱 실패:", parseErr);
          resolve(null);
        }
      },
    );
  });
}

export class VoiceManager {
  private queues: Map<string, GuildQueue>;
  private client: import("discord.js").Client | null = null;

  constructor() {
    this.queues = new Map();
  }

  public setClient(client: import("discord.js").Client) {
    this.client = client;
  }

  public getClient() {
    return this.client;
  }

  public getQueue(guildId: string): GuildQueue {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new GuildQueue(guildId);
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  public getAllQueues(): Map<string, GuildQueue> {
    return this.queues;
  }

  public removeQueue(guildId: string) {
    this.queues.delete(guildId);
  }
}

export const globalVoiceManager = new VoiceManager();
