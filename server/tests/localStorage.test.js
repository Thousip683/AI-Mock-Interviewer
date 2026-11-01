import { beforeEach, expect, it, vi } from 'vitest';
const { files } = vi.hoisted(() => ({ files: new Map() }));
vi.mock('mongoose', () => ({ default: { connection: { readyState: 0 } } }));
vi.mock('../models/Interview.js', () => ({ default: {} }));
vi.mock('fs/promises', () => ({ default: {
  mkdir: vi.fn(),
  writeFile: async (path, content, options) => {
    await new Promise(resolve => setTimeout(resolve, 1));
    if (options?.flag === 'wx' && files.has(path)) throw Object.assign(new Error('exists'), { code: 'EEXIST' });
    files.set(path, content);
  },
  readFile: async path => { await new Promise(resolve => setTimeout(resolve, 1)); return files.get(path); },
  rename: async (from, to) => { files.set(to, files.get(from)); files.delete(from); },
  rm: async path => { files.delete(path); },
} }));
import { createInterviewRecord, saveInterviewRecord, listInterviewsByUser, getInterviewRecord } from '../repositories/interviewRepository.js';

beforeEach(() => { files.clear(); });
it('keeps concurrent live transcript writes from dropping other interviews in the JSON store', async () => {
  const config = { role: 'Engineer', type: 'technical', experience: 'mid', mode: 'live' };
  const [a, b] = await Promise.all([createInterviewRecord('a', config), createInterviewRecord('b', config)]);
  await Promise.all([
    saveInterviewRecord('a', { ...a, liveTranscript: [{ speaker: 'user', text: 'First answer' }] }),
    saveInterviewRecord('b', { ...b, liveTranscript: [{ speaker: 'user', text: 'Second answer' }] }),
  ]);
  expect(await listInterviewsByUser('a')).toHaveLength(1);
  expect(await listInterviewsByUser('b')).toHaveLength(1);
  expect((await getInterviewRecord('a', a._id)).liveTranscript[0].text).toBe('First answer');
  expect((await getInterviewRecord('b', b._id)).liveTranscript[0].text).toBe('Second answer');
  expect([...files.keys()].some(path => path.endsWith('.tmp'))).toBe(false);
});
