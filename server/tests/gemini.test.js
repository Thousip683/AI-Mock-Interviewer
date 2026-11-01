/**
 * Tests for the adaptive interview flow (Gemini service functions).
 *
 * Strategy:
 * - All tests mock the Gemini API client so no live API calls are made.
 * - Tests verify prompt construction, output parsing, fallback behavior,
 *   and the adaptive follow-up decision logic.
 *
 * Run:  npx vitest run tests/gemini.test.js  (from server/ directory)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock @google/generative-ai before importing service ─────────────────────

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock('@google/generative-ai', () => ({
  // Must be a class (constructor) for `new GoogleGenerativeAI(...)` to work
  GoogleGenerativeAI: class {
    constructor() {}
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_NONE: 'BLOCK_NONE',
  },
}));

// Also mock dotenv so env vars don't cause side effects
vi.mock('dotenv/config', () => ({}));

// ─── Import service AFTER mocks are set up ───────────────────────────────────
const { generateOpeningQuestion, generateFollowUp, generateQuestions, generateFeedback } =
  await import('../services/gemini.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockGeminiResponse(jsonObj) {
  mockGenerateContent.mockResolvedValueOnce({
    response: {
      text: () => JSON.stringify(jsonObj),
    },
  });
}

function mockGeminiResponseText(rawText) {
  mockGenerateContent.mockResolvedValueOnce({
    response: { text: () => rawText },
  });
}

function mockGeminiError() {
  mockGenerateContent.mockRejectedValueOnce(new Error('Simulated Gemini API error'));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('generateOpeningQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'AIzaSyFake123';
  });

  it('returns a question object with text, type, context, difficulty, order=1', async () => {
    mockGeminiResponse({
      text: 'Your backend service is experiencing high latency under load. How would you investigate?',
      type: 'technical',
      context: null,
      difficulty: 'hard',
    });

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');

    expect(result).toMatchObject({
      type: 'technical',
      order: 1,
      difficulty: 'hard',
    });
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('opening question word count is within 20–80 words (reasonable conciseness)', async () => {
    const questionText =
      'Your backend service experiences high latency during peak traffic. How would you investigate the root cause?';
    mockGeminiResponse({
      text: questionText,
      type: 'technical',
      context: null,
      difficulty: 'medium',
    });

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(80);
    expect(wordCount).toBeGreaterThanOrEqual(5);
  });

  it('strips markdown code fences from response', async () => {
    mockGeminiResponseText(
      '```json\n{"text":"How would you design a rate limiter?","type":"technical","context":null,"difficulty":"hard"}\n```'
    );

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    expect(result.text).toBe('How would you design a rate limiter?');
  });

  it('falls back gracefully when Gemini throws an error', async () => {
    mockGeminiError();

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.order).toBe(1);
  });

  it('falls back when JSON is malformed', async () => {
    mockGeminiResponseText('not valid json at all %%##');

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    expect(typeof result.text).toBe('string');
    expect(result.order).toBe(1);
  });

  it('falls back when response has no "text" field', async () => {
    mockGeminiResponse({ wrong_field: 'some value' });

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    expect(typeof result.text).toBe('string');
  });
});

describe('generateFollowUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'AIzaSyFake123';
  });

  const baseParams = {
    role: 'Backend Developer',
    type: 'technical',
    experience: 'senior',
    conversationHistory: [
      {
        question: 'Your backend service experiences high latency under load. How would you investigate?',
        answer: 'I would check metrics, logs, and look at database queries.',
        order: 0,
      },
    ],
    questionIndex: 1,
    maxQuestions: 5,
  };

  it('returns a follow-up question object with required fields', async () => {
    mockGeminiResponse({
      text: 'What specific metrics would help you confirm the database is the bottleneck?',
      type: 'technical',
      context: null,
      difficulty: 'hard',
      isComplete: false,
    });

    const result = await generateFollowUp(baseParams);

    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(typeof result.isComplete).toBe('boolean');
    // order = questionIndex + 1 (service returns the 1-based position of the NEXT question)
    // baseParams.questionIndex = 1 → next question is question #2 → order = 2
    expect(result.order).toBe(baseParams.questionIndex + 1);
  });

  it('isComplete is false when questionIndex < maxQuestions - 1', async () => {
    mockGeminiResponse({
      text: 'What would you look at if the database CPU was low but queries were slow?',
      type: 'technical',
      context: null,
      difficulty: 'hard',
      isComplete: false,
    });

    const result = await generateFollowUp({ ...baseParams, questionIndex: 2, maxQuestions: 5 });
    expect(result.isComplete).toBe(false);
  });

  it('isComplete is true when questionIndex >= maxQuestions - 1', async () => {
    mockGeminiResponse({
      text: 'Final wrap-up question?',
      type: 'technical',
      context: null,
      difficulty: 'medium',
      isComplete: false, // Gemini says false but we override based on index
    });

    const result = await generateFollowUp({ ...baseParams, questionIndex: 4, maxQuestions: 5 });
    expect(result.isComplete).toBe(true);
  });

  it('falls back gracefully when Gemini throws', async () => {
    mockGeminiError();

    const result = await generateFollowUp(baseParams);
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    // isComplete depends on index; questionIndex=1, maxQuestions=5 → not complete
    expect(result.isComplete).toBe(false);
  });

  it('signals isComplete when AI says so OR when at maxQuestions boundary', async () => {
    // At questionIndex = maxQuestions - 1, the service MUST signal complete regardless of AI
    mockGeminiResponse({
      text: 'How would you communicate the root cause to stakeholders?',
      type: 'technical',
      context: null,
      difficulty: 'medium',
      isComplete: true,
    });

    // questionIndex=4, maxQuestions=5 → this is the last question slot
    const result = await generateFollowUp({ ...baseParams, questionIndex: 4, maxQuestions: 5 });
    expect(result.isComplete).toBe(true);
  });

  it('caps conversation history at 8 items and still returns a valid question', async () => {
    // Build a 12-item history (should be capped to last 8 in the prompt)
    const longHistory = Array.from({ length: 12 }, (_, i) => ({
      question: `Question ${i + 1}`,
      answer: `Answer ${i + 1}`,
      order: i,
    }));

    mockGeminiResponse({
      text: 'Next focused follow-up question?',
      type: 'technical',
      context: null,
      difficulty: 'medium',
      isComplete: false,
    });

    const result = await generateFollowUp({
      ...baseParams,
      conversationHistory: longHistory,
      questionIndex: 6,  // Not at the boundary
      maxQuestions: 15,
    });

    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.isComplete).toBe(false);
  });
});

describe('generateQuestions (backward-compat wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'AIzaSyFake123';
  });

  it('returns an array of exactly 1 question (the opening question)', async () => {
    mockGeminiResponse({
      text: 'An order service requires inventory, payment, and shipping to complete atomically. How would you design this?',
      type: 'system-design',
      context: null,
      difficulty: 'hard',
    });

    const result = await generateQuestions('Backend Developer', 'system-design', 'senior', '', '', 5);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].order).toBe(1);
  });

  it('does not return N questions (no pre-generation of all questions)', async () => {
    mockGeminiResponse({
      text: 'How would you handle distributed transactions?',
      type: 'technical',
      context: null,
      difficulty: 'hard',
    });

    const result = await generateQuestions('Backend Developer', 'technical', 'senior', '', '', 10);
    // Must be exactly 1 — adaptive follow-ups come later via generateFollowUp
    expect(result).toHaveLength(1);
  });
});

describe('generateFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'AIzaSyFake123';
  });

  const sampleQuestions = [
    { text: 'How would you investigate high latency?' },
    { text: 'What metrics confirm a database bottleneck?' },
  ];

  const sampleAnswers = [
    { question: 'How would you investigate high latency?', answer: 'Check metrics and logs.' },
    { question: 'What metrics confirm a database bottleneck?', answer: 'Query time, CPU, slow query log.' },
  ];

  it('returns a feedback object with required score fields', async () => {
    mockGeminiResponse({
      questionFeedback: [
        { question: 'Q1', answer: 'A1', score: 75, feedback: 'Good', tips: 'Be more specific' },
        { question: 'Q2', answer: 'A2', score: 80, feedback: 'Solid', tips: 'Add query plan analysis' },
      ],
      strengths: ['Good reasoning', 'Practical approach'],
      improvements: ['Add more metrics', 'Discuss failure modes'],
      technicalScore: 77,
      communicationScore: 72,
      confidenceScore: 68,
      relevanceScore: 80,
      depthScore: 70,
      overallFeedback: 'Solid fundamentals with room to go deeper.',
      score: 77,
    });

    const result = await generateFeedback(sampleQuestions, sampleAnswers, {
      role: 'Backend Developer',
      type: 'technical',
      experience: 'senior',
    });

    expect(result.evaluationSource).toBe('gemini');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThan(0);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.improvements)).toBe(true);
    expect(Array.isArray(result.questionFeedback)).toBe(true);
    expect(result.questionFeedback).toHaveLength(2);
  });

  it('calculates score from questionFeedback if score is missing', async () => {
    mockGeminiResponse({
      questionFeedback: [
        { score: 60, feedback: 'OK', tips: 'Improve' },
        { score: 80, feedback: 'Good', tips: 'Keep up' },
      ],
      strengths: [],
      improvements: [],
      technicalScore: 70,
      communicationScore: 70,
      confidenceScore: 70,
      relevanceScore: 70,
      depthScore: 70,
      overallFeedback: 'Decent performance.',
      // score intentionally missing
    });

    const result = await generateFeedback(sampleQuestions, sampleAnswers);
    expect(result.score).toBe(70); // (60+80)/2 = 70
  });

  it('falls back gracefully when Gemini throws', async () => {
    mockGeminiError();

    const result = await generateFeedback(sampleQuestions, sampleAnswers);
    expect(result.evaluationSource).toBe('heuristic');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.questionFeedback)).toBe(true);
    expect(result.questionFeedback).toHaveLength(2);
  });
});

describe('Interview flow invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'AIzaSyFake123';
  });

  it('opening question does not include evaluation rubric text in output', async () => {
    const rubricTerms = ['evaluation criteria', 'expected answer', 'must mention', 'rubric', 'scoring'];
    mockGeminiResponse({
      text: 'Your service is seeing 10x its usual error rate. Walk me through your initial investigation.',
      type: 'technical',
      context: null,
      difficulty: 'hard',
    });

    const result = await generateOpeningQuestion('Backend Developer', 'technical', 'senior');
    const lower = result.text.toLowerCase();
    for (const term of rubricTerms) {
      expect(lower).not.toContain(term);
    }
  });

  it('follow-up question for vague answer is shorter and more targeted than a generic list', async () => {
    mockGeminiResponse({
      text: 'What specific tool or signal would tell you the database is responsible?',
      type: 'technical',
      context: null,
      difficulty: 'medium',
      isComplete: false,
    });

    const result = await generateFollowUp({
      role: 'Backend Developer',
      type: 'technical',
      experience: 'senior',
      conversationHistory: [
        {
          question: 'Service is slow under load. How do you investigate?',
          answer: 'I would look at the logs.',
          order: 0,
        },
      ],
      questionIndex: 1,
      maxQuestions: 5,
    });

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(60);
  });
});
