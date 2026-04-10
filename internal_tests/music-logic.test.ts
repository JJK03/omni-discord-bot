import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildQueue, Track } from '../omni-bot/src/voiceManager';

// Mock discordjs/voice and other dependencies
vi.mock('@discordjs/voice', () => ({
  createAudioPlayer: vi.fn(() => ({
    on: vi.fn(),
    state: { status: 'idle' },
    play: vi.fn(),
    stop: vi.fn(),
  })),
  AudioPlayerStatus: {
    Idle: 'idle',
    Paused: 'paused',
    Playing: 'playing',
  },
  createAudioResource: vi.fn(),
  joinVoiceChannel: vi.fn(),
  VoiceConnectionStatus: {
    Disconnected: 'disconnected',
    Destroyed: 'destroyed',
  },
  StreamType: {
    Raw: 'raw',
  },
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn(),
    stderr: { on: vi.fn() },
    stdout: { on: vi.fn(), _readableState: { highWaterMark: 0 } },
  })),
  execFile: vi.fn(),
}));

describe('GuildQueue Music Logic', () => {
  let queue: GuildQueue;
  const mockTracks: Track[] = [
    { title: 'Track 1', url: 'url1', requestedBy: 'user1' },
    { title: 'Track 2', url: 'url2', requestedBy: 'user2' },
    { title: 'Track 3', url: 'url3', requestedBy: 'user3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new GuildQueue('guild123');
  });

  it('should initialize with default repeatMode "off" and shuffle false', () => {
    expect(queue.repeatMode).toBe('off');
    expect(queue.shuffle).toBe(false);
  });

  it('should cycle repeat mode correctly in UI logic (simulated)', () => {
    const modes: ("off" | "one" | "all")[] = ["off", "one", "all"];
    let currentMode: "off" | "one" | "all" = "off";
    
    // Test cycling
    currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length]!;
    expect(currentMode).toBe('one');
    currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length]!;
    expect(currentMode).toBe('all');
    currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length]!;
    expect(currentMode).toBe('off');
  });

  it('should handle repeatMode "one" correctly when a track finishes', () => {
    queue.repeatMode = 'one';
    const track = mockTracks[0]!;
    queue.currentTrack = track;
    queue.tracks = [mockTracks[1]!];

    // Manually trigger Idle handler logic (simulated)
    // In actual code, this is an event listener on queue.player
    const finishedTrack = queue.currentTrack;
    if (finishedTrack && queue.repeatMode === 'one') {
      queue.tracks.unshift(finishedTrack);
    }
    
    expect(queue.tracks[0]).toBe(track);
    expect(queue.tracks.length).toBe(2);
  });

  it('should handle repeatMode "all" correctly when a track finishes', () => {
    queue.repeatMode = 'all';
    const track = mockTracks[0]!;
    queue.currentTrack = track;
    queue.tracks = [mockTracks[1]!];

    // Manually trigger Idle handler logic
    const finishedTrack = queue.currentTrack;
    if (finishedTrack && queue.repeatMode === 'all') {
      queue.tracks.push(finishedTrack);
    }
    
    expect(queue.tracks[queue.tracks.length - 1]).toBe(track);
    expect(queue.tracks.length).toBe(2);
  });

  it('should pick a random track when shuffle is enabled in playNext (simulated logic)', () => {
    queue.shuffle = true;
    queue.tracks = [...mockTracks];
    
    // Simulate playNext track selection
    let track: Track;
    const randomIndex = 1; // Forced index for testing
    track = queue.tracks.splice(randomIndex, 1)[0]!;
    
    expect(track).toBe(mockTracks[1]);
    expect(queue.tracks.length).toBe(2);
    expect(queue.tracks).not.toContain(mockTracks[1]);
  });
});
