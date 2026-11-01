import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getRecord, saveRecord, feedback } = vi.hoisted(() => ({ getRecord: vi.fn(), saveRecord: vi.fn(), feedback: vi.fn() }));
vi.mock('../repositories/interviewRepository.js', () => ({
  getInterviewRecord: getRecord, saveInterviewRecord: saveRecord,
  listInterviewsByUser: vi.fn(), getStatsByUser: vi.fn(), createInterviewRecord: vi.fn(), deleteInterviewRecord: vi.fn(),
}));
vi.mock('../services/gemini.js', () => ({ generateQuestions: vi.fn(), generateFollowUp: vi.fn(), generateFeedback: feedback }));
import { consumeLiveTicket, issueLiveTicket, reserveLive } from '../services/liveSessions.js';
import { createLiveTicket, finishLiveInterview, transcriptToAnswers } from '../services/liveInterviewService.js';
import { generateInterviewQuestions, submitInterviewAnswers } from '../services/interviewService.js';

let record;
beforeEach(() => {
  vi.resetAllMocks();
  process.env.GEMINI_API_KEY = 'test-key';
  record = { _id: 'live-1', clerkUserId: 'owner', mode: 'live', status: 'in_progress', type: 'technical', liveDurationSeconds: 180,
    liveTranscript: [{ speaker: 'ai', text: 'Explain your approach.' }, { speaker: 'user', text: 'I would measure first.' }] };
  getRecord.mockImplementation(async (userId, id) => userId === record.clerkUserId && id === record._id ? structuredClone(record) : null);
  saveRecord.mockImplementation(async (_, updated) => { record = structuredClone(updated); return record; });
  feedback.mockResolvedValue({ score: 75, questionFeedback: [{ score: 75 }] });
});

describe('live authorization and completion', () => {
  it('issues single-use expiring tickets and invalidates an older ticket for the same user', () => {
    const older = issueLiveTicket('ticket-user', 'a', 100);
    const current = issueLiveTicket('ticket-user', 'b', 100);
    expect(consumeLiveTicket(older, 101)).toBeNull();
    expect(consumeLiveTicket(current, 101)).toMatchObject({ interviewId: 'b' });
    expect(consumeLiveTicket(current, 102)).toBeNull();
    expect(consumeLiveTicket(issueLiveTicket('ticket-user', 'a', 100), 60100)).toBeNull();
  });
  it('denies another user access and completed interviews a connection ticket', async () => {
    await expect(createLiveTicket('stranger', 'live-1')).rejects.toMatchObject({ status: 404 });
    record.status = 'completed';
    await expect(createLiveTicket('owner', 'live-1')).rejects.toMatchObject({ status: 409 });
  });
  it('does not fall back to pretend live audio when the key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(createLiveTicket('owner', 'live-1')).rejects.toMatchObject({ status: 503 });
  });
  it('blocks evaluation while the session is saving and rejects competing sessions', async () => {
    const release = reserveLive('live-1');
    try {
      await expect(finishLiveInterview('owner', 'live-1')).rejects.toMatchObject({ status: 409 });
      await expect(createLiveTicket('owner', 'live-1')).rejects.toMatchObject({ status: 409 });
    } finally { release(); }
  });
  it('evaluates the server transcript, stores duration and makes finish idempotent', async () => {
    await finishLiveInterview('owner', 'live-1');
    expect(record.status).toBe('completed');
    expect(record.duration).toBe(3);
    expect(record.answers[0].answer).toBe('I would measure first.');
    expect(feedback.mock.calls[0][0][0].text).toBe('Explain your approach.');
    await finishLiveInterview('owner', 'live-1');
    expect(feedback).toHaveBeenCalledTimes(1);
  });
  it('rejects empty transcripts and the standard submit/generate paths for live interviews', async () => {
    record.liveTranscript = [];
    await expect(finishLiveInterview('owner', 'live-1')).rejects.toMatchObject({ status: 400 });
    await expect(submitInterviewAnswers('owner', 'live-1', [])).rejects.toMatchObject({ status: 400 });
    await expect(generateInterviewQuestions('owner', 'live-1')).rejects.toMatchObject({ status: 400 });
    expect(feedback).not.toHaveBeenCalled();
  });
  it('pairs fragments and omits unanswered closing remarks', () => {
    expect(transcriptToAnswers([
      { speaker: 'ai', text: 'How?' }, { speaker: 'user', text: 'First measure.' },
      { speaker: 'user', text: 'Then optimize.' }, { speaker: 'ai', text: 'Thank you.' },
    ])).toEqual([{ question: 'How?', answer: 'First measure.\nThen optimize.' }]);
  });
});
