import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildQueue } from './voiceManager.js';

vi.mock('@discordjs/voice', () => ({
  createAudioPlayer: vi.fn().mockReturnValue({
    on: vi.fn(),
    state: { status: 'idle' },
    stop: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
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

describe('GuildQueue.abortController', () => {
  let queue: GuildQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new GuildQueue('test-guild');
    vi.spyOn(queue as any, '_killChildProcesses').mockImplementation(() => {});
    vi.spyOn(queue as any, '_clearPrefetchCache').mockResolvedValue(undefined);
  });

  it('새로 생성한 큐의 signal은 abort되지 않은 상태여야 한다', () => {
    expect(queue.abortController.signal.aborted).toBe(false);
  });

  it('destroy() 호출 후 signal이 abort된다', async () => {
    await queue.destroy();
    expect(queue.abortController.signal.aborted).toBe(true);
  });

  it('destroy() 후 생성한 새 큐는 fresh signal을 가진다', async () => {
    await queue.destroy();
    const newQueue = new GuildQueue('test-guild');
    expect(newQueue.abortController.signal.aborted).toBe(false);
  });

  it('destroy() 호출 후 tracks가 비워지고 currentTrack이 null이 된다', async () => {
    queue.tracks = [{ title: 'S', url: 'u', requestedBy: 'r' }];
    queue.currentTrack = { title: 'S', url: 'u', requestedBy: 'r' };
    await queue.destroy();
    expect(queue.tracks).toHaveLength(0);
    expect(queue.currentTrack).toBeNull();
  });
});
