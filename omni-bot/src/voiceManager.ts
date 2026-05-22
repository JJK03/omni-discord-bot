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
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// yt-dlp 바이너리 경로
const require = createRequire(import.meta.url);
const YTDL_BIN = "yt-dlp";

// 임시 오디오 파일 디렉토리 (봇 시작 시 잔여 파일 정리)
const AUDIO_TMP_DIR = path.join(os.tmpdir(), "omni-audio");
fs.mkdirSync(AUDIO_TMP_DIR, { recursive: true });
// 이전 실행에서 남은 파일 정리
try {
  for (const f of fs.readdirSync(AUDIO_TMP_DIR)) {
    fs.unlinkSync(path.join(AUDIO_TMP_DIR, f));
  }
} catch {}

export interface Track {
  title: string;
  url: string;
  requestedBy: string;
}

export type RepeatMode = "off" | "one" | "all";

export class GuildQueue {
  public guildId: string;
  public connection: VoiceConnection | null = null;
  public player: AudioPlayer;
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  public repeatMode: RepeatMode = "off";
  public shuffle: boolean = false;
  // 트랙 시작/종료 시 외부 콜백 (임베드 업데이트용)
  public onTrackStart: ((track: Track) => void) | null = null;
  public onQueueEnd: (() => void) | null = null;
  public onQueueUpdate: (() => void) | null = null;
  // 봇 퇴장/정지 시 패널 삭제용 콜백
  public onDestroy: (() => void) | null = null;

  // 현재 실행 중인 자식 프로세스 참조 (스킵/정지 시 안전 정리용)
  private _ytdlpProcess: ReturnType<typeof spawn> | null = null;
  private _ffmpegProcess: ReturnType<typeof spawn> | null = null;
  // 현재 재생 중인 임시 오디오 파일 경로
  private _currentTmpFile: string | null = null;

  // 자동 퇴장용 타이머
  private _disconnectTimeout: NodeJS.Timeout | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer({
      behaviors: {
        // 로컬 파일 재생이므로 기본값(50)으로 복원
        maxMissedFrames: 50,
      },
    });

    // 플레이어 상태 전환 추적 (reconnect → Idle 버그 진단용)
    this.player.on("stateChange", (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        console.log(`[Audio:State] ${oldState.status} → ${newState.status} (곡: ${this.currentTrack?.title ?? "없음"})`);
      }
    });

    // 플레이어 에러 핸들링
    this.player.on("error", (error) => {
      console.error(
        `오디오 에러: ${error.message} (리소스: ${(error.resource as any)?.metadata?.title})`,
      );
      this.playNext();
    });

    // 음악이 끝나면 다음 곡 재생
    this.player.on(AudioPlayerStatus.Idle, () => {
      const finishedTrack = this.currentTrack;
      this._killChildProcesses();

      if (finishedTrack) {
        if (this.repeatMode === "one") {
          // 현재 곡 반복: 대기열 맨 앞에 다시 추가
          this.tracks.unshift(finishedTrack);
        } else if (this.repeatMode === "all") {
          // 전체 반복: 대기열 맨 뒤에 다시 추가
          this.tracks.push(finishedTrack);
        }
      }

      this.currentTrack = null;

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
   * 현재 실행 중인 자식 프로세스와 임시 파일을 안전하게 정리합니다.
   */
  private _killChildProcesses() {
    if (this._ffmpegProcess) {
      try { this._ffmpegProcess.kill("SIGKILL"); } catch {}
      this._ffmpegProcess = null;
    }
    if (this._ytdlpProcess) {
      try { this._ytdlpProcess.kill("SIGKILL"); } catch {}
      this._ytdlpProcess = null;
    }
    if (this._currentTmpFile) {
      try { fs.unlinkSync(this._currentTmpFile); } catch {}
      this._currentTmpFile = null;
    }
  }

  /**
   * yt-dlp로 트랙을 임시 파일(.webm)로 다운로드합니다.
   * 다운로드 완료 후 파일 경로를 반환하므로 네트워크 reconnect 없이 안정적으로 재생됩니다.
   */
  private async _downloadToTmp(url: string, retries = 1): Promise<string | null> {
    const tmpPath = path.join(AUDIO_TMP_DIR, `${this.guildId}-${Date.now()}.webm`);

    const attempt = () => new Promise<string | null>((resolve, reject) => {
      execFile(
        YTDL_BIN,
        [
          url,
          "-f", "bestaudio[ext=webm]/bestaudio",
          "-o", tmpPath,
          "--no-warnings",
          "--force-ipv4",
          "--geo-bypass",
          "--no-playlist",
          "--user-agent",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
        { timeout: 120000 },
        (error, _stdout, stderr) => {
          if (error) {
            console.error("[Audio:Download] 다운로드 실패:", stderr || error.message);
            try { fs.unlinkSync(tmpPath); } catch {}
            return reject(error);
          }
          if (!fs.existsSync(tmpPath)) {
            return reject(new Error("다운로드된 파일이 없습니다."));
          }
          resolve(tmpPath);
        },
      );
    });

    for (let i = 0; i <= retries; i++) {
      try {
        if (i > 0) {
          console.log(`[Audio:Download] 재시도 중... (${i}/${retries})`);
          await new Promise((r) => setTimeout(r, 1500));
        }
        return await attempt();
      } catch (err) {
        if (i === retries) console.error("[Audio:Download] 최종 실패:", err);
      }
    }
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
    // currentTrack이 없고 Idle일 때만 재생 시작 (백그라운드 배치 중복 트리거 방지)
    if (!this.currentTrack && this.player.state.status === AudioPlayerStatus.Idle) {
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
   * yt-dlp로 임시 파일에 다운로드 후 로컬에서 재생 — 네트워크 reconnect로 인한 배속/점프 현상 방지.
   */
  public async playNext() {
    if (this.tracks.length === 0) {
      return;
    }

    this._stopDisconnectTimer();
    this._killChildProcesses();

    let track: Track;
    if (this.shuffle && this.tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.tracks.length);
      track = this.tracks.splice(randomIndex, 1)[0]!;
    } else {
      track = this.tracks.shift()!;
    }
    this.currentTrack = track;

    try {
      const tmpFile = await this._downloadToTmp(track.url);
      if (!tmpFile) {
        throw new Error("트랙 다운로드에 실패했습니다.");
      }
      this._currentTmpFile = tmpFile;

      // WebmOpus는 Opus 타임스탬프 기반으로 discordjs/voice가 재생 속도를 직접 제어
      const resource = createAudioResource(fs.createReadStream(tmpFile), {
        inputType: StreamType.WebmOpus,
        inlineVolume: false,
      });

      this.player.play(resource);
      console.log(`[Audio:Event] '${track.title}' 재생 시작`);
      this.onTrackStart?.(track);
    } catch (err) {
      console.error("음악 재생 실패:", err);
      this._currentTmpFile = null;
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
      .replace(/^\s*-+/, "")
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
      { maxBuffer: 1024 * 1024 * 10, timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`YouTube 검색 실패 [${sanitizedQuery.slice(0, 30)}]:`, error.message);
          if (stderr) console.error("yt-dlp stderr:", stderr);
          return resolve(null);
        }

        try {
          const result = JSON.parse(stdout);
          // flat-playlist 모드에서 ytsearch 결과는 entries[0].url에 실제 YouTube URL이 있음
          const entry = result?.entries?.[0];
          const videoUrl = entry?.url ?? null;
          const title = entry?.title || result.title || "알 수 없는 곡";
          if (videoUrl) {
            resolve({ title, url: videoUrl });
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

/**
 * iTunes Lookup API를 통해 단일 트랙 정보를 가져옵니다.
 */
function itunesLookup(trackId: string): Promise<{ trackName: string; artistName: string } | null> {
  return new Promise((resolve) => {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}`;
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          const track = (data.results as any[]).find((r: any) => r.wrapperType === "track");
          resolve(track ? { trackName: track.trackName, artistName: track.artistName } : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Apple Music 트랙 URL → iTunes API로 곡 정보 추출 → YouTube 검색 후 Track 반환
 * URL 형식: https://music.apple.com/kr/album/...?i={trackId}
 */
export async function resolveAppleMusicTrack(
  appleUrl: string,
  requestedBy: string,
): Promise<Track | null> {
  try {
    const parsed = new URL(appleUrl);
    const trackId = parsed.searchParams.get("i");
    if (!trackId || !/^\d+$/.test(trackId)) {
      console.error("[AppleMusic] 트랙 URL에 유효한 ?i= 파라미터가 없습니다.");
      return null;
    }

    const info = await itunesLookup(trackId);
    if (!info) {
      console.error("[AppleMusic] iTunes API에서 트랙 정보를 가져오지 못했습니다.");
      return null;
    }

    const searchQuery = `${info.trackName} ${info.artistName}`;
    console.log(`[AppleMusic] 트랙 검색: ${searchQuery}`);

    const result = await searchYouTube(searchQuery);
    if (!result) return null;

    return { title: `${info.trackName} - ${info.artistName}`, url: result.url, requestedBy };
  } catch (err) {
    console.error("[AppleMusic] 트랙 처리 오류:", err);
    return null;
  }
}

/**
 * Apple Music 페이지 HTML 파싱으로 플레이리스트 트랙 목록 추출
 * 5개씩 병렬 검색하며, 배치 완료마다 onBatchReady 콜백을 즉시 호출합니다.
 * 첫 배치부터 재생을 시작하고 나머지는 백그라운드에서 큐에 추가됩니다.
 */
export async function resolveAppleMusicPlaylist(
  appleUrl: string,
  requestedBy: string,
  onBatchReady?: (tracks: Track[], isFirst: boolean) => void,
): Promise<{ playlistTitle: string; tracks: Track[] } | null> {
  // URL 기본 검증
  try {
    const parsed = new URL(appleUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const fetchHtml = () => new Promise<string | null>((resolve) => {
    const req = https.get(
      appleUrl,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", () => resolve(null));
      },
    );
    req.on("error", () => resolve(null));
    req.setTimeout(20000, () => { req.destroy(); resolve(null); });
  });

  let html = await fetchHtml();
  if (!html) {
    console.warn("[AppleMusic] 첫 번째 fetch 실패, 3초 후 재시도...");
    await new Promise((r) => setTimeout(r, 3000));
    html = await fetchHtml();
  }
  if (!html) {
    console.error("[AppleMusic] 플레이리스트 페이지를 가져오지 못했습니다.");
    return null;
  }

  // 인라인 JSON 데이터 블록 추출
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  let pageData: any = null;
  for (const tag of scriptMatches) {
    const inner = tag.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
    try {
      const parsed = JSON.parse(inner);
      // Apple Music 페이지 데이터 구조: { data: [{ data: { sections: [...] } }] }
      if (parsed?.data?.[0]?.data?.sections) {
        pageData = parsed;
        break;
      }
    } catch {
      // 파싱 불가 블록 무시
    }
  }

  if (!pageData) {
    console.error("[AppleMusic] 페이지에서 트랙 데이터를 찾을 수 없습니다.");
    return null;
  }

  const sections: any[] = pageData.data[0].data.sections;
  const headerSection = sections[0];
  const playlistTitle: string = headerSection?.items?.[0]?.title ?? "Apple Music 플레이리스트";

  // 트랙 섹션: title과 artistName이 모두 있는 items
  const trackSection = sections.find((s: any) =>
    s.items?.length > 0 && s.items[0]?.artistName !== undefined,
  );

  if (!trackSection) {
    console.error("[AppleMusic] 트랙 섹션을 찾을 수 없습니다.");
    return null;
  }

  const rawItems: any[] = trackSection.items;
  console.log(`[AppleMusic] 플레이리스트 '${playlistTitle}': ${rawItems.length}개 트랙 발견`);

  // 5개씩 병렬 검색, 배치 완료마다 콜백 호출
  const BATCH_SIZE = 5;
  const allTracks: Track[] = [];
  let isFirst = true;

  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);
    const batchResults: (Track | null)[] = new Array(batch.length).fill(null);

    await Promise.all(
      batch.map(async (item: any, batchIdx: number) => {
        const trackName: string = item.title;
        const artistName: string = item.artistName;
        if (!trackName || !artistName) return;
        try {
          const result = await searchYouTube(`${trackName} ${artistName}`);
          if (result) {
            batchResults[batchIdx] = { title: `${trackName} - ${artistName}`, url: result.url, requestedBy };
          } else {
            console.warn(`[AppleMusic] 검색 실패 (건너뜀): ${trackName} - ${artistName}`);
          }
        } catch (err) {
          console.warn(`[AppleMusic] 검색 오류 (건너뜀): ${trackName} - ${artistName}`, err);
        }
      }),
    );

    const ready = batchResults.filter((t): t is Track => t !== null);
    if (ready.length > 0) {
      allTracks.push(...ready);
      try {
        if (onBatchReady) await onBatchReady(ready, isFirst);
      } catch (err) {
        console.error("[AppleMusic] 배치 enqueue 오류:", err);
      }
      isFirst = false;
    }
  }

  console.log(`[AppleMusic] YouTube 검색 완료: ${allTracks.length}/${rawItems.length}개 매칭`);
  return { playlistTitle, tracks: allTracks };
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
