import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: { post, defaults: { baseURL: 'http://localhost:5000/api' } } }));
import useLiveInterview from '../src/hooks/useLiveInterview.js';

let hook, renderer, socket, context, track, capture;
class Socket {
  static OPEN = 1;
  constructor() { socket = this; this.readyState = 1; this.bufferedAmount = 0; this.send = vi.fn(); this.close = vi.fn(); }
  emit(message) { this.onmessage({ data: JSON.stringify(message) }); }
}
class Context {
  constructor() {
    context = this;
    this.state = 'running'; this.sampleRate = 48000; this.currentTime = 0;
    this.resume = vi.fn(async () => {});
    this.close = vi.fn(async () => { this.state = 'closed'; });
    this.audioWorklet = { addModule: vi.fn(async () => {}) };
  }
  createMediaStreamSource() { return { connect: node => node, disconnect: vi.fn() }; }
  createGain() { return { gain: {}, connect: vi.fn(), disconnect: vi.fn() }; }
  createBuffer() { return { duration: 0.5, copyToChannel: vi.fn() }; }
  createBufferSource() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
}
function Harness() { hook = useLiveInterview('live-1'); return null; }
beforeEach(() => {
  vi.clearAllMocks();
  socket = null;
  track = { enabled: true, stop: vi.fn() };
  vi.stubGlobal('window', { isSecureContext: true, AudioContext: Context, location: { href: 'http://localhost:5173' } });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track], getAudioTracks: () => [track] })) } });
  vi.stubGlobal('AudioWorkletNode', class {
    constructor() { capture = this; this.port = {}; this.disconnect = vi.fn(); }
    connect(node) { return node; }
  });
  vi.stubGlobal('WebSocket', Socket);
  post.mockResolvedValue({ data: { ticket: 'one-use-ticket' } });
  act(() => { renderer = create(React.createElement(Harness)); });
});
afterEach(() => { act(() => renderer.unmount()); vi.unstubAllGlobals(); });
async function start() {
  await act(async () => { await hook.start('Kore'); });
  act(() => { socket.onopen(); socket.emit({ type: 'ready', transcript: [] }); });
}

describe('live interview microphone lifecycle', () => {
  it('authenticates the socket, streams audio, mutes, and releases devices on unmount', async () => {
    await start();
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: 'start', ticket: 'one-use-ticket', voice: 'Kore' });
    act(() => capture.port.onmessage({ data: new Float32Array(2048).fill(0.25) }));
    expect(JSON.parse(socket.send.mock.lastCall[0]).type).toBe('audio');
    act(() => hook.toggleMute());
    expect(track.enabled).toBe(false);
    expect(hook.muted).toBe(true);
    const calls = socket.send.mock.calls.length;
    act(() => capture.port.onmessage({ data: new Float32Array(2048) }));
    expect(socket.send).toHaveBeenCalledTimes(calls);
    act(() => hook.toggleMute());
    expect(track.enabled).toBe(true);
    act(() => renderer.unmount());
    expect(track.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
  });
  it('waits for the server transcript acknowledgement before requesting feedback', async () => {
    await start();
    let finishing;
    act(() => { finishing = hook.finish(); });
    expect(track.stop).toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(socket.send.mock.lastCall[0]).type).toBe('end');
    await act(async () => {
      socket.emit({ type: 'stopped', transcript: [{ speaker: 'user', text: 'Final answer' }] });
      expect(await finishing).toBe(true);
    });
    expect(post).toHaveBeenLastCalledWith('/interviews/live-1/live-finish');
    expect(hook.status).toBe('finished');
  });
  it('cleans up after a socket failure and allows a fresh connection', async () => {
    await start();
    act(() => socket.onerror());
    expect(hook.status).toBe('error');
    expect(track.stop).toHaveBeenCalled();
    await start();
    expect(hook.status).toBe('listening');
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('shows denied permission without requesting a server ticket', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    await act(async () => { await hook.start('Kore'); });
    expect(hook.error).toContain('permission was denied');
    expect(context.close).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it('stops a late microphone grant after navigating away', async () => {
    let grant;
    navigator.mediaDevices.getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
    let starting;
    await act(async () => { starting = hook.start('Kore'); });
    act(() => renderer.unmount());
    await act(async () => { grant({ getTracks: () => [track], getAudioTracks: () => [track] }); await starting; });
    expect(track.stop).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});

it('cancels microphone setup and releases a permission grant that arrives later', async () => {
  let grant;
  navigator.mediaDevices.getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  let starting;
  await act(async () => { starting = hook.start('Kore'); });
  act(() => hook.cancel());
  expect(hook.status).toBe('idle');
  await act(async () => { grant({ getTracks: () => [track], getAudioTracks: () => [track] }); await starting; });
  expect(track.stop).toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});
