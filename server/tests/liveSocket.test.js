import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { getRecord, saveRecord } = vi.hoisted(() => ({ getRecord: vi.fn(), saveRecord: vi.fn() }));
vi.mock('../repositories/interviewRepository.js', () => ({
  getInterviewRecord: getRecord, saveInterviewRecord: saveRecord,
  listInterviewsByUser: vi.fn(), getStatsByUser: vi.fn(), createInterviewRecord: vi.fn(), deleteInterviewRecord: vi.fn(),
}));
import { attachLiveServer } from '../services/liveSocket.js';
import { issueLiveTicket, isLiveBusy } from '../services/liveSessions.js';

let server, wss, ws, connect, callbacks, upstream, record;
const messages = [];
const waitFor = async type => {
  await vi.waitFor(() => expect(messages.some(message => message.type === type)).toBe(true), { timeout: 4000 });
  return messages.find(message => message.type === type);
};
beforeEach(async () => {
  messages.length = 0;
  vi.clearAllMocks();
  record = { _id: 'socket-1', clerkUserId: 'owner', mode: 'live', status: 'pending', role: 'Engineer', liveTranscript: [] };
  getRecord.mockImplementation(async user => user === 'owner' ? structuredClone(record) : null);
  saveRecord.mockImplementation(async (_, value) => { record = structuredClone(value); return record; });
  upstream = { close: vi.fn(), sendRealtimeInput: vi.fn(), sendClientContent: vi.fn() };
  connect = vi.fn(async options => { callbacks = options.callbacks; return upstream; });
  server = createServer();
  wss = attachLiveServer(server, { connect });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/live`);
  ws.on('message', raw => messages.push(JSON.parse(raw.toString())));
  await once(ws, 'open');
});
afterEach(async () => {
  ws.terminate();
  for (const client of wss.clients) client.terminate();
  await new Promise(resolve => wss.close(resolve));
  await new Promise(resolve => server.close(resolve));
  await vi.waitFor(() => expect(isLiveBusy('socket-1')).toBe(false));
});

async function start(user = 'owner') {
  ws.send(JSON.stringify({ type: 'start', ticket: issueLiveTicket(user, 'socket-1'), voice: 'Kore' }));
  await waitFor(user === 'owner' ? 'ready' : 'error');
}

describe('authenticated voice relay', () => {
  it('rejects unauthenticated audio before opening a paid upstream session', async () => {
    ws.send(JSON.stringify({ type: 'audio', data: 'AAAA' }));
    await waitFor('error');
    expect(connect).not.toHaveBeenCalled();
  });
  it('checks interview ownership again when consuming the connection ticket', async () => {
    await start('stranger');
    expect(connect).not.toHaveBeenCalled();
  });
  it('relays audio, handles interruptions and flushes the final transcript before acknowledgement', async () => {
    await start();
    expect(connect.mock.calls[0][0].config.systemInstruction).toContain('Engineer');
    ws.send(JSON.stringify({ type: 'audio', data: 'AAAA' }));
    await vi.waitFor(() => expect(upstream.sendRealtimeInput).toHaveBeenCalledWith({ audio: { data: 'AAAA', mimeType: 'audio/pcm;rate=16000' } }));
    callbacks.onmessage({ serverContent: { outputTranscription: { text: 'Explain indexing.' }, modelTurn: { parts: [{ inlineData: { data: 'AAAA', mimeType: 'audio/pcm;rate=24000' } }] } } });
    await waitFor('audio');
    callbacks.onmessage({ serverContent: { interrupted: true, inputTranscription: { text: 'Indexes speed up reads.' } } });
    await waitFor('interrupted');
    ws.send(JSON.stringify({ type: 'end' }));
    await vi.waitFor(() => expect(upstream.sendRealtimeInput).toHaveBeenCalledWith({ audioStreamEnd: true }));
    callbacks.onmessage({ serverContent: { inputTranscription: { text: ' With a write cost.' }, turnComplete: true } });
    await waitFor('stopped');
    expect(record.liveTranscript[0].interrupted).toBe(true);
    expect(record.liveTranscript[1].text).toBe('Indexes speed up reads. With a write cost.');
    expect(upstream.close).toHaveBeenCalled();
    expect(isLiveBusy('socket-1')).toBe(false);
  });
  it('closes an upstream connection that resolves after the browser disconnects', async () => {
    let resolve;
    connect.mockImplementation(() => new Promise(done => { resolve = done; }));
    ws.send(JSON.stringify({ type: 'start', ticket: issueLiveTicket('owner', 'socket-1') }));
    await vi.waitFor(() => expect(connect).toHaveBeenCalled());
    ws.close();
    await once(ws, 'close');
    await vi.waitFor(() => expect(isLiveBusy('socket-1')).toBe(false));
    resolve(upstream);
    await vi.waitFor(() => expect(upstream.close).toHaveBeenCalled());
  });
});
