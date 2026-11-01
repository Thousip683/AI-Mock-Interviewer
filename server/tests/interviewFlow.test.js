import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContent, getRecord, saveRecord } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getRecord: vi.fn(),
  saveRecord: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() { return { generateContent }; }
  },
  HarmCategory: {},
  HarmBlockThreshold: { BLOCK_NONE: 'BLOCK_NONE' },
}));
vi.mock('dotenv/config', () => ({}));
vi.mock('../repositories/interviewRepository.js', () => ({
  getInterviewRecord: getRecord,
  saveInterviewRecord: saveRecord,
  listInterviewsByUser: vi.fn(),
  getStatsByUser: vi.fn(),
  createInterviewRecord: vi.fn(),
  deleteInterviewRecord: vi.fn(),
}));

import {
  generateInterviewQuestions,
  generateFollowUpQuestion,
  submitInterviewAnswers,
} from '../services/interviewService.js';

describe('adaptive interview completion across service and Gemini', () => {
  let record;

  beforeEach(() => {
    vi.resetAllMocks();
    record = {
      _id: 'interview-1', clerkUserId: 'user-1', role: 'Developer',
      type: 'technical', experience: 'mid', questionCount: 5,
      status: 'pending', questions: [], conversationHistory: [],
    };
    getRecord.mockImplementation(async () => structuredClone(record));
    saveRecord.mockImplementation(async (userId, updated) => {
      expect(userId).toBe('user-1');
      record = structuredClone(updated);
      return record;
    });
  });

  it.each(['AI', 'fallback', 'AI completion flag'])(
    'accepts all five answers before evaluation using %s questions', async (mode) => {
      let generated = 0;
      generateContent.mockImplementation(async () => {
        if (mode === 'fallback') throw new Error('API unavailable');
        generated += 1;
        return { response: { text: () => JSON.stringify({
          text: `Question ${generated}`, type: 'technical', difficulty: 'medium',
          isComplete: mode === 'AI completion flag',
        }) } };
      });

      let [question] = await generateInterviewQuestions('user-1', 'interview-1');
      const answers = [];
      // Exercise the response contract used by InterviewScreen: it submits
      // immediately if isComplete is true, otherwise displays the question.
      for (let index = 0; index < 5; index += 1) {
        answers.push({ question: question.text, answer: `Answer ${index + 1}` });
        if (index === 4) break;
        const response = await generateFollowUpQuestion('user-1', 'interview-1', {
          previousQuestion: question.text, previousAnswer: answers[index].answer,
          questionIndex: index,
        });
        expect(response.isComplete).toBe(false);
        expect(response.question.text).toBeTruthy();
        question = response.question;
      }

      expect(record.questions).toHaveLength(5);
      expect(record.status).toBe('in_progress');
      generateContent.mockResolvedValue({ response: { text: () => JSON.stringify({
        score: 80, questionFeedback: answers.map(answer => ({ ...answer, score: 80 })),
      }) } });
      await submitInterviewAnswers('user-1', 'interview-1', answers);
      expect(record.status).toBe('completed');
      expect(record.answers).toHaveLength(5);
      expect(record.answers[4].answer).toBe('Answer 5');
      expect(generateContent.mock.lastCall[0]).toContain('Candidate: Answer 5');
    },
  );

  it.each([1, 5])('returns completion without generating a question after %i answers', async (count) => {
    record.questionCount = count;
    record.questions = Array.from({ length: count }, (_, i) => ({ text: `Q${i + 1}` }));
    const result = await generateFollowUpQuestion('user-1', 'interview-1', {
      previousQuestion: `Q${count}`, previousAnswer: 'Final answer', questionIndex: count - 1,
    });
    expect(result).toEqual({ question: null, isComplete: true });
    expect(generateContent).not.toHaveBeenCalled();
    expect(record.questions).toHaveLength(count);
    expect(record.conversationHistory.at(-1).answer).toBe('Final answer');
  });
});
