import { describe, expect, it } from 'vitest';
import { encodePcm, decodePcm, liveSocketUrl } from '../../client/src/lib/liveAudio.js';

describe('browser audio framing', () => {
  it('encodes signed little-endian PCM and clamps overflow', () => {
    const decoded = decodePcm(encodePcm(new Float32Array([-2, -0.5, 0, 0.5, 2]), 16000));
    expect(decoded[0]).toBe(-1);
    expect(decoded[1]).toBe(-0.5);
    expect(decoded[2]).toBe(0);
    expect(decoded[3]).toBeCloseTo(0.5, 3);
    expect(decoded[4]).toBeCloseTo(1, 3);
  });
  it('downsamples hardware audio to the required 16kHz', () => {
    expect(decodePcm(encodePcm(new Float32Array(4800).fill(0.5), 48000))).toHaveLength(1600);
  });
  it('uses secure sockets in production and supports relative API URLs', () => {
    expect(liveSocketUrl('https://api.example.com/api', 'https://app.example.com')).toBe('wss://api.example.com/api/live');
    expect(liveSocketUrl('/api', 'http://localhost:5173')).toBe('ws://localhost:5173/api/live');
  });
});
