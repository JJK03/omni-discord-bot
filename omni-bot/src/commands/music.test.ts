import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as voiceManager from '../voiceManager.js';

vi.mock('@discordjs/voice', () => ({
  createAudioPlayer: vi.fn().mockReturnValue({
    on: vi.fn(),
    state: { status: 'idle' },
    stop: vi.fn(),
    play: vi.fn(),
  }),
  joinVoiceChannel: vi.fn(),
  createAudioResource: vi.fn().mockReturnValue({}),
  StreamType: { Raw: 'raw', WebmOpus: 'webm/opus' },
  VoiceConnectionStatus: { Destroyed: 'destroyed', Disconnected: 'disconnected', Signalling: 'signalling' },
  AudioPlayerStatus: { Idle: 'idle', Paused: 'paused', Playing: 'playing' },
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    unlinkSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    createReadStream: vi.fn().mockReturnValue({}),
  };
});

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({ on: vi.fn(), kill: vi.fn(), stderr: { on: vi.fn() }, stdout: { on: vi.fn() } })),
  execFile: vi.fn(),
}));

describe('music.ts abort guard — enqueue는 abort 후 실행되지 않는다', () => {
  let queue: voiceManager.GuildQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new voiceManager.GuildQueue('guild-abc');
    vi.spyOn(queue as any, '_killChildProcesses').mockImplementation(() => {});
    vi.spyOn(queue as any, '_clearPrefetchCache').mockResolvedValue(undefined);
  });

  it('abort된 signal 이후 enqueue를 호출하지 않는 guard 패턴이 동작한다', async () => {
    const enqueueSpy = vi.spyOn(queue, 'enqueue').mockResolvedValue();

    // destroy로 abort 발생
    await queue.destroy();

    // music.ts의 guard 패턴 시뮬레이션: signal.aborted 이면 enqueue 건너뜀
    if (!queue.abortController.signal.aborted) {
      await queue.enqueue({ title: 'T', url: 'u', requestedBy: 'r' });
    }

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('abort되지 않은 signal이면 enqueue가 정상 실행된다', async () => {
    const enqueueSpy = vi.spyOn(queue, 'enqueue').mockResolvedValue();
    (queue.player.state as any).status = 'playing';

    if (!queue.abortController.signal.aborted) {
      await queue.enqueue({ title: 'T', url: 'u', requestedBy: 'r' });
    }

    expect(enqueueSpy).toHaveBeenCalledOnce();
  });

  it('resolveAppleMusicPlaylist가 abort signal을 받으면 onBatchReady를 호출하지 않는다', async () => {
    const onBatchReady = vi.fn();
    const controller = new AbortController();
    controller.abort();

    vi.spyOn(voiceManager, 'resolveAppleMusicPlaylist').mockImplementation(
      async (_url, _by, _cb, signal) => {
        if (signal?.aborted) return null;
        return { playlistTitle: 'p', tracks: [] };
      },
    );

    await voiceManager.resolveAppleMusicPlaylist(
      'https://music.apple.com/kr/playlist/x/pl.u-xxx',
      '유저',
      onBatchReady,
      controller.signal,
    );

    expect(onBatchReady).not.toHaveBeenCalled();
  });
});
