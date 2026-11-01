import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getRecord, saveRecord, feedback } = vi.hoisted(() => ({ getRecord: vi.fn(), saveRecord: vi.fn(), feedback: vi.fn() }));
vi.mock('../repositories/interviewRepository.js', () => ({
  getInterviewRecord: getRecord, saveInterviewRecord: saveRecord,
  listInterviewsByUser: vi.fn(), getStatsByUser: vi.fn(), createInterviewRecord: vi.fn(), deleteInterviewRecord: vi.fn(),
}));
vi.mock('../services/gemini.js', () => ({ generateQuestions: vi.fn(), generateFollowUp: vi.fn(), generateFeedback: feedback }));
import { consumeLiveTicket, issueLiveTicket, reserveLive } from '../services/liveSessions.js';
import { createLiveTicket, finishLiveInterview, transcriptToAnswers } from '../services/liveInterviewService.js';
import { createInterview, generateInterviewQuestions, submitInterviewAnswers, getInterviewFeedback, refreshInterviewFeedback } from '../services/interviewService.js';

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

it('retains detailed learning reports when a saved live interview is reopened or refreshed', async () => {
  const details = { score: 35, feedback: 'The index trade-off is missing.', correctAnswer: 'Indexes speed reads but add write and storage costs.', missingConcepts: ['Write overhead'], studyPoints: ['Check EXPLAIN output'], summary: 'Measure before indexing.', practiceTask: 'Compare indexed and unindexed plans.' };
  feedback.mockResolvedValue({ score: 35, evaluationSource: 'gemini', questionFeedback: [details], roadmap: [{ topic: 'Indexing', priority: 'high', steps: ['Read query plans'], successCriteria: 'Explain the measured trade-off' }] });
  await finishLiveInterview('owner', 'live-1');
  const first = await getInterviewFeedback('owner', 'live-1');
  expect(first.questionFeedback[0].correctAnswer).toBe(details.correctAnswer);
  expect(first.roadmap[0].topic).toBe('Indexing');
  const completedAt = record.completedAt;
  const refreshed = await refreshInterviewFeedback('owner', 'live-1');
  expect(refreshed.questionFeedback[0].studyPoints).toEqual(['Check EXPLAIN output']);
  expect(record.completedAt).toEqual(completedAt);
  await expect(refreshInterviewFeedback('stranger', 'live-1')).rejects.toMatchObject({ status: 404 });
});

it('keeps the existing report when re-analysis cannot reach AI', async () => {
  record.status = 'completed';
  record.answers = [{ question: 'Explain indexing', answer: 'An index speeds reads' }];
  record.questions = [{ text: 'Explain indexing' }];
  record.feedback = { overallFeedback: 'Original saved analysis' };
  feedback.mockResolvedValue({ score: 55, evaluationSource: 'heuristic' });
  await expect(refreshInterviewFeedback('owner', 'live-1')).rejects.toMatchObject({ status: 503 });
  expect(record.feedback.overallFeedback).toBe('Original saved analysis');
  expect(saveRecord).not.toHaveBeenCalled();
});

it.each([
  { role: '   ', type: 'technical', experience: 'mid' },
  { role: 'Developer', type: 'invalid', experience: 'mid' },
  { role: 'Developer', type: 'technical', experience: 'invalid' },
  { role: 'Developer', type: 'technical', experience: 'mid', questionCount: 0 },
  { role: 'Developer', type: 'technical', experience: 'mid', questionCount: 21 },
  { role: 'Developer', type: 'technical', experience: 'mid', questionCount: 2.5 },
  { role: 'Developer', type: 'technical', experience: 'mid', jobDescription: 123 },
])('rejects invalid configuration in every storage mode: %j', async payload => {
  await expect(createInterview('owner', payload)).rejects.toMatchObject({ status: 400 });
});
