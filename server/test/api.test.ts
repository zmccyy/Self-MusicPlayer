import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type request from 'supertest';

// Point the server at a throwaway data dir before any server module is imported.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'music-player-test-'));

const { createApp } = await import('../src/app.js');
const { getDb, closeDb } = await import('../src/db.js');

/** Build a minimal valid 16-bit PCM WAV file (1 s of a sine at `freq` Hz). */
function makeWav(seconds = 1, sampleRate = 44100, freq = 440): Buffer {
  const numSamples = seconds * sampleRate;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * freq * i) / sampleRate) * 8000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

let app: request.Agent;

beforeEach(async () => {
  getDb().exec('DELETE FROM playlist_tracks; DELETE FROM playlists; DELETE FROM lyrics; DELETE FROM tracks;');
  app = (await import('supertest')).default(createApp());
});

afterAll(() => {
  closeDb();
});

// Vary tone frequency by name so each upload has unique content
// (the library deduplicates identical file hashes).
function nameFreq(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 2000;
  return 220 + h;
}

async function uploadWav(name = 'Test Artist - Test Song.wav'): Promise<string> {
  const res = await app
    .post('/api/tracks')
    .attach('files', makeWav(1, 44100, nameFreq(name)), name)
    .expect(201);
  expect(res.body.added).toHaveLength(1);
  return res.body.added[0].id as string;
}

describe('health', () => {
  it('reports ok with track count', async () => {
    const res = await app.get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.trackCount).toBe('number');
  });
});

describe('tracks', () => {
  it('uploads a wav file and extracts metadata', async () => {
    const res = await app
      .post('/api/tracks')
      .attach('files', makeWav(), 'Test Artist - Test Song.wav')
      .expect(201);
    const track = res.body.added[0];
    expect(track.title).toBe('Test Song');
    expect(track.artist).toBe('Test Artist');
    expect(track.duration).toBeGreaterThan(0.5);
    expect(track.url).toBe(`/api/tracks/${track.id}/stream`);
    expect(res.body.errors).toEqual([]);
  });

  it('reports unsupported files as per-file errors', async () => {
    const res = await app
      .post('/api/tracks')
      .attach('files', Buffer.from('not audio'), 'evil.txt')
      .expect(400);
    expect(res.body.added).toHaveLength(0);
    expect(res.body.errors[0].fileName).toBe('evil.txt');
  });

  it('rejects requests without files', async () => {
    await app.post('/api/tracks').expect(400);
  });

  it('lists tracks and searches by query', async () => {
    await uploadWav('Alpha Artist - Alpha Song.wav');
    await uploadWav('Beta Artist - Beta Song.wav');

    const all = await app.get('/api/tracks').expect(200);
    expect(all.body.tracks).toHaveLength(2);

    const filtered = await app.get('/api/tracks?query=alpha').expect(200);
    expect(filtered.body.tracks).toHaveLength(1);
    expect(filtered.body.tracks[0].title).toBe('Alpha Song');
  });

  it('streams audio with HTTP Range support', async () => {
    const id = await uploadWav();
    const full = await app.get(`/api/tracks/${id}/stream`).expect(200);
    expect(full.headers['accept-ranges']).toBe('bytes');
    expect(Number(full.headers['content-length'])).toBeGreaterThan(0);

    const ranged = await app
      .get(`/api/tracks/${id}/stream`)
      .set('Range', 'bytes=0-99')
      .expect(206);
    expect(ranged.headers['content-range']).toMatch(/^bytes 0-99\//);
    expect(ranged.body).toHaveLength(100);
  });

  it('patches track metadata', async () => {
    const id = await uploadWav();
    const res = await app
      .patch(`/api/tracks/${id}`)
      .send({ title: 'Renamed', artist: 'New Artist', album: 'New Album' })
      .expect(200);
    expect(res.body.track.title).toBe('Renamed');
    expect(res.body.track.artist).toBe('New Artist');
    expect(res.body.track.album).toBe('New Album');
  });

  it('deletes a track and its file', async () => {
    const id = await uploadWav();
    await app.delete(`/api/tracks/${id}`).expect(200);
    await app.get(`/api/tracks/${id}`).expect(404);
  });

  it('reports duplicated content as per-file errors', async () => {
    const name = 'Dup Artist - Dup Song.wav';
    const wav = makeWav(1, 44100, nameFreq(name));
    await app.post('/api/tracks').attach('files', wav, name).expect(201);
    const res = await app.post('/api/tracks').attach('files', wav, name).expect(400);
    expect(res.body.added).toHaveLength(0);
    expect(res.body.errors[0].error).toContain('已存在');
  });

  it('returns lyric payload with none source for wav', async () => {
    const id = await uploadWav();
    const res = await app.get(`/api/tracks/${id}/lyric`).expect(200);
    expect(res.body.lyric).toBeNull();
    expect(res.body.source).toBe('none');
  });
});

describe('playlists', () => {
  it('performs full CRUD with ordering', async () => {
    const id1 = await uploadWav('Artist One - Song One.wav');
    const id2 = await uploadWav('Artist Two - Song Two.wav');

    const created = await app.post('/api/playlists').send({ name: '我的最爱' }).expect(201);
    const playlistId = created.body.playlist.id as string;

    await app.post(`/api/playlists/${playlistId}/tracks`).send({ trackIds: [id1, id2] }).expect(201);
    let detail = await app.get(`/api/playlists/${playlistId}`).expect(200);
    expect(detail.body.tracks.map((t: { id: string }) => t.id)).toEqual([id1, id2]);
    expect(detail.body.playlist.trackCount).toBe(2);

    await app
      .put(`/api/playlists/${playlistId}/tracks/order`)
      .send({ trackIds: [id2, id1] })
      .expect(200);
    detail = await app.get(`/api/playlists/${playlistId}`).expect(200);
    expect(detail.body.tracks.map((t: { id: string }) => t.id)).toEqual([id2, id1]);

    const afterRemove = await app
      .delete(`/api/playlists/${playlistId}/tracks/${id2}`)
      .expect(200);
    expect(afterRemove.body.tracks.map((t: { id: string }) => t.id)).toEqual([id1]);

    await app.patch(`/api/playlists/${playlistId}`).send({ name: '改名了' }).expect(200);
    await app.delete(`/api/playlists/${playlistId}`).expect(200);
    await app.get(`/api/playlists/${playlistId}`).expect(404);
  });

  it('cascades playlist membership when a track is deleted', async () => {
    const trackId = await uploadWav();
    const created = await app.post('/api/playlists').send({ name: 'cascade' }).expect(201);
    const playlistId = created.body.playlist.id as string;
    await app.post(`/api/playlists/${playlistId}/tracks`).send({ trackIds: [trackId] }).expect(201);
    await app.delete(`/api/tracks/${trackId}`).expect(200);
    const detail = await app.get(`/api/playlists/${playlistId}`).expect(200);
    expect(detail.body.tracks).toHaveLength(0);
  });
});

// NetEase 代理测试依赖真实外网；默认跳过，设 RUN_NETEASE_TESTS=1 开启。
const runNetease = Boolean(process.env.RUN_NETEASE_TESTS)
describe.skipIf(!runNetease)('netease proxy', () => {
  it('searches and normalizes songs', async () => {
    const res = await app.get('/api/netease/search').query({ keyword: '晴天' }).expect(200);
    expect(Array.isArray(res.body.songs)).toBe(true);
    if (res.body.songs.length > 0) {
      const song = res.body.songs[0];
      expect(typeof song.id).toBe('string');
      expect(typeof song.name).toBe('string');
      expect(typeof song.artists).toBe('string');
    }
  });

  it('rejects empty keyword', async () => {
    await app.get('/api/netease/search').expect(400);
  });

  it('proxies stream requests from the same origin', async () => {
    // 2730151393 is a free (fee=0) track whose outer URL serves real audio
    const res = await app.get('/api/netease/stream/2730151393').expect(200);
    expect(res.headers['content-type']).toContain('audio');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(0);
  });

  it('rejects VIP tracks whose outer URL serves an HTML notice page', async () => {
    // 186016 (周杰伦-晴天) is VIP-gated upstream: outer URL returns a text/html page
    const res = await app.get('/api/netease/stream/186016');
    expect([502]).toContain(res.status);
    if (res.status === 502) {
      expect(res.body.error).toContain('非音频内容');
    }
  });
});

describe('library scan', () => {
  it('imports audio files from a directory and skips duplicates', async () => {
    const scanDir = mkdtempSync(path.join(tmpdir(), 'scan-test-'));
    writeFileSync(path.join(scanDir, 'Scan Artist - Scan Song.wav'), makeWav(1));
    writeFileSync(path.join(scanDir, 'notes.txt'), 'not audio');

    const first = await app.post('/api/library/scan').send({ path: scanDir }).expect(200);
    expect(first.body.scanned).toBe(1);
    expect(first.body.added).toBe(1);
    expect(first.body.errors).toEqual([]);

    const second = await app.post('/api/library/scan').send({ path: scanDir }).expect(200);
    expect(second.body.added).toBe(0);
    expect(second.body.skipped).toBe(1);

    const list = await app.get('/api/tracks?query=scan').expect(200);
    expect(list.body.tracks).toHaveLength(1);
  });

  it('rejects missing or non-directory paths', async () => {
    await app.post('/api/library/scan').send({}).expect(400);
    await app.post('/api/library/scan').send({ path: 'Z:\\definitely\\missing' }).expect(400);
  });
});

describe('database integrity', () => {
  it('schema includes lyrics table', () => {
    const tables = getDb()
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name);
    expect(tables).toContain('lyrics');
  });
});
