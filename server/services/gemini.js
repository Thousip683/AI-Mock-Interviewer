import 'dotenv/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// gemini-2.0-flash: stable, fast, reliable JSON output without empty-response issues
const GEMINI_MODEL = 'gemini-2.0-flash';

// Safety settings — BLOCK_NONE prevents silent content blocks that cause empty responses
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GEMINI] ⚠️ GEMINI_API_KEY is not set! AI generation will fall back to templates.');
  }
  const genAI = new GoogleGenerativeAI(apiKey || '');
  console.log(`[GEMINI] 🔧 Using model: ${GEMINI_MODEL}`);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    safetySettings: SAFETY_SETTINGS,
  });
}

/** Call Gemini and return parsed JSON. Strips markdown fences. */
async function callGemini(prompt, label) {
  const model = getModel();
  console.log(`[GEMINI] 📡 Dispatching prompt [${label}] to ${GEMINI_MODEL}...`);
  const startTime = Date.now();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();
  const duration = Date.now() - startTime;
  console.log(`[GEMINI] 📥 [${label}] response received in ${duration}ms (${text.length} chars)`);

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return text;
}

// ─── PROMPT COMPONENTS ───────────────────────────────────────────────────────

function interviewerPersona(role, experience, type) {
  return `You are an expert technical interviewer at a top-tier technology company.
You are conducting a ${type} interview for a ${experience}-level ${role} position.
Your job is to assess the candidate's genuine competence through natural conversation.`;
}

function levelGuidance(experience) {
  const depthMap = {
    entry: 'Expect candidates to understand fundamentals. Focus on reasoning process over advanced architecture.',
    mid: 'Expect working knowledge and practical trade-offs. Probe for real-world experience.',
    senior: 'Expect deep reasoning, trade-off analysis, failure handling, and system-level thinking. Introduce ambiguity and scale progressively.',
    lead: 'Expect architectural ownership, cross-team impact, constraints under business pressure, and mentorship perspective.',
  };
  return depthMap[experience] || depthMap['mid'];
}

// ─── OPENING QUESTION ────────────────────────────────────────────────────────

/**
 * Generates a single concise opening question for the interview.
 * Returns a question object: { text, type, context, difficulty, order }
 */
export async function generateOpeningQuestion(role, type, experience, jobDescription, focusArea) {
  console.log(`[GEMINI] 🎯 generateOpeningQuestion: role="${role}", type="${type}", experience="${experience}"`);

  const prompt = `${interviewerPersona(role, experience, type)}

${levelGuidance(experience)}

TASK: Generate exactly ONE concise opening question to begin the interview.

RULES — OPENING QUESTION:
- 20–50 words maximum. Shorter is usually better.
- Present ONE primary scenario or problem. Do not combine multiple problems.
- Include only the context a candidate needs to understand what is being asked.
- Ask one central question — not a list of sub-questions.
- Do NOT reveal expected solutions, hint at answers, or list concepts the candidate should mention.
- Do NOT use generic openers like "Tell me about yourself" for technical interviews unless the type is behavioral.
- Do NOT use exhaustive checklists or bullet-point prompts embedded in the question.
- Adapt the wording naturally to the topic — avoid cookie-cutter templates.
- For technical/system-design: present a realistic scenario (production issue, design problem, constraint).
- For behavioral: use a STAR-framing scenario relevant to the experience level.
- For general: ask about approach, decision-making, or a practical tradeoff.
${focusArea ? `- Prefer topics related to: ${focusArea}` : ''}
${jobDescription ? `- Job context (use if relevant): ${jobDescription.substring(0, 300)}` : ''}

OUTPUT: Return ONLY valid JSON, no other text:
{
  "text": "The question text here (20–50 words)",
  "type": "${type}",
  "context": null,
  "difficulty": "medium"
}`;

  try {
    const raw = await callGemini(prompt, 'opening-question');
    const parsed = JSON.parse(raw);
    if (!parsed.text || typeof parsed.text !== 'string') {
      throw new Error('Missing "text" field in opening question response');
    }
    console.log(`[GEMINI] ✅ Opening question generated (${parsed.text.split(' ').length} words): "${parsed.text.substring(0, 80)}..."`);
    return { text: parsed.text, type, context: parsed.context || null, difficulty: parsed.difficulty || 'medium', order: 1 };
  } catch (err) {
    console.error(`[GEMINI] ❌ generateOpeningQuestion failed: ${err.message}`);
    console.warn('[GEMINI] 🔄 Using fallback opening question');
    return getFallbackOpeningQuestion(role, type, experience);
  }
}

// ─── FOLLOW-UP QUESTION ──────────────────────────────────────────────────────

/**
 * Generates an adaptive follow-up question based on the conversation so far.
 * @param {object} params
 * @param {string} params.role
 * @param {string} params.type
 * @param {string} params.experience
 * @param {Array<{question: string, answer: string, order: number}>} params.conversationHistory
 * @param {number} params.questionIndex - how many questions have been answered (1-based)
 * @param {number} params.maxQuestions - total question count configured for this interview
 * @returns {{ text, type, context, difficulty, order, isComplete }}
 */
export async function generateFollowUp({ role, type, experience, conversationHistory, questionIndex, maxQuestions }) {
  console.log(`[GEMINI] 🔁 generateFollowUp: question ${questionIndex + 1}/${maxQuestions} for role="${role}", level="${experience}"`);

  // Cap history to last 8 exchanges to stay within token budget
  const history = conversationHistory.slice(-8);
  const historyText = history.map((h, i) =>
    `Q${i + 1}: ${h.question}\nCandidate: ${h.answer || '(no answer provided)'}`
  ).join('\n\n');

  const remainingQuestions = maxQuestions - questionIndex;
  const isNearEnd = remainingQuestions <= 1;

  const prompt = `${interviewerPersona(role, experience, type)}

${levelGuidance(experience)}

INTERVIEW CONVERSATION SO FAR:
${historyText}

TASK: Analyze the candidate's most recent answer and decide what to ask next.

ANALYSIS RULES:
- Evaluate: technical correctness, reasoning depth, completeness, assumptions made, gaps present.
- If the answer is vague or incorrect: probe with a targeted clarifying question.
- If the answer is strong: increase depth or introduce a harder constraint (scale, failure, edge case).
- If the answer shows a gap (e.g., candidate ignores observability): ask about that specific gap.
- If a topic has been adequately covered: move to a different aspect of the same problem or a related topic.
- Do NOT repeat a question the candidate already answered well.
- Do NOT reveal the correct answer or internal evaluation rubric.
- Do NOT lecture. Ask, don't tell.

FOLLOW-UP RULES:
- Ask exactly ONE focused question.
- 15–40 words maximum.
- Natural conversational tone — as a real interviewer would speak.
- If ${isNearEnd ? 'this is the final question, wrap up the topic naturally.' : `there are ${remainingQuestions} questions remaining, continue probing depth.`}
- isComplete: set to true ONLY if the topic has been thoroughly explored AND this is question ${maxQuestions} or beyond. Otherwise false.

OUTPUT: Return ONLY valid JSON, no other text:
{
  "text": "The follow-up question here",
  "type": "${type}",
  "context": null,
  "difficulty": "medium",
  "isComplete": false
}`;

  try {
    const raw = await callGemini(prompt, `followup-q${questionIndex + 1}`);
    const parsed = JSON.parse(raw);
    if (!parsed.text || typeof parsed.text !== 'string') {
      throw new Error('Missing "text" field in follow-up response');
    }
    const isComplete = parsed.isComplete === true || questionIndex >= maxQuestions - 1;
    console.log(`[GEMINI] ✅ Follow-up question generated (isComplete=${isComplete}): "${parsed.text.substring(0, 80)}"`);
    return {
      text: parsed.text,
      type,
      context: parsed.context || null,
      difficulty: parsed.difficulty || 'medium',
      order: questionIndex + 1,
      isComplete,
    };
  } catch (err) {
    console.error(`[GEMINI] ❌ generateFollowUp failed: ${err.message}`);
    console.warn('[GEMINI] 🔄 Using fallback follow-up question');
    const isComplete = questionIndex >= maxQuestions - 1;
    return { ...getFallbackFollowUp(role, type, questionIndex), order: questionIndex + 1, isComplete };
  }
}

// ─── OPENING QUESTION (BACKWARD-COMPAT WRAPPER) ──────────────────────────────

/**
 * Backward-compatible wrapper. Returns a 1-element array so existing code
 * that calls generateQuestions() and expects an array still works.
 */
export async function generateQuestions(role, type, experience, jobDescription, focusArea, count = 5) {
  console.log(`[GEMINI] 🤖 generateQuestions (compat wrapper): role="${role}", type="${type}", experience="${experience}", count=${count}`);
  const question = await generateOpeningQuestion(role, type, experience, jobDescription, focusArea);
  console.log(`[GEMINI] ✅ generateQuestions returning 1 opening question (adaptive follow-ups will be requested per answer)`);
  return [question];
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

/**
 * Generates a comprehensive evaluation based on the full conversation.
 * @param {Array} questions - array of question objects
 * @param {Array} answers - array of answer objects { question, answer }
 * @param {object} interviewMeta - { role, type, experience }
 */
export async function generateFeedback(questions, answers, interviewMeta = {}) {
  const { role = '', type = '', experience = '' } = interviewMeta;
  console.log(`[GEMINI] 🤖 generateFeedback: evaluating ${questions?.length || 0} Q&As for ${role} (${experience})`);

  let conversationText = '';
  questions.forEach((q, i) => {
    conversationText += `\nQ${i + 1}: ${q.text}\n`;
    conversationText += `Candidate: ${answers[i]?.answer || '(no answer provided)'}\n`;
  });

  const prompt = `You are an expert interview coach evaluating a completed ${type || 'technical'} interview for a ${experience || 'mid'}-level ${role || 'Software Engineer'} position.

INTERVIEW TRANSCRIPT:
${conversationText}

EVALUATION INSTRUCTIONS:
- Score each answer honestly based on evidence in the response, not keyword matching.
- Award partial credit for partially correct answers.
- Do NOT penalize valid alternative approaches that satisfy the requirements.
- For senior/lead levels, apply higher bar: expect trade-off analysis, failure handling, and system thinking.
- Identify patterns across answers: consistent strengths and recurring gaps.
- Provide actionable, specific improvement tips — not generic advice.

SCORING DIMENSIONS (0–100 each):
- technicalScore: correctness and depth of technical content
- communicationScore: clarity, structure, and conciseness of explanations
- confidenceScore: certainty, decisiveness, and willingness to commit to solutions
- relevanceScore: how well answers addressed the actual question
- depthScore: degree of nuance, trade-offs, and edge case consideration

Return ONLY valid JSON in this exact format:
{
  "questionFeedback": [
    {
      "question": "Original question text",
      "answer": "Candidate's answer",
      "score": 75,
      "feedback": "Specific, constructive feedback on what was good and what was missing",
      "tips": "One concrete improvement tip"
    }
  ],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Improvement area 1", "Improvement area 2"],
  "technicalScore": 70,
  "communicationScore": 75,
  "confidenceScore": 65,
  "relevanceScore": 80,
  "depthScore": 72,
  "overallFeedback": "2-3 sentence honest overall assessment with the most important thing to improve",
  "score": 72
}`;

  try {
    const raw = await callGemini(prompt, 'feedback');
    const feedback = JSON.parse(raw);

    if (!feedback.score && feedback.questionFeedback) {
      const scores = feedback.questionFeedback.map(qf => qf.score || 0);
      feedback.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    console.log(`[GEMINI] ✅ Feedback generated. Score: ${feedback.score}/100, Strengths: ${feedback.strengths?.length || 0}, Improvements: ${feedback.improvements?.length || 0}`);
    return feedback;
  } catch (err) {
    console.error(`[GEMINI] ❌ generateFeedback failed: ${err.message}`);
    console.warn('[GEMINI] 🔄 Using fallback feedback');
    return getFallbackFeedback(questions, answers);
  }
}

// ─── FALLBACKS ────────────────────────────────────────────────────────────────

function getFallbackOpeningQuestion(role, type, experience) {
  const fallbacks = {
    technical: `You're debugging a production outage where your ${role} service is returning 500 errors intermittently under load. How would you approach diagnosing and resolving the issue?`,
    'system-design': `Design a URL shortening service that needs to handle 10,000 requests per second at peak. Walk me through your high-level architecture.`,
    behavioral: `Tell me about a technically complex project you led end-to-end. What was the hardest engineering decision you had to make?`,
    general: `What's the most impactful technical improvement you've made in a production system? What drove your approach?`,
  };
  return {
    text: fallbacks[type] || fallbacks['general'],
    type,
    context: null,
    difficulty: experience === 'entry' ? 'easy' : experience === 'senior' || experience === 'lead' ? 'hard' : 'medium',
    order: 1,
  };
}

function getFallbackFollowUp(role, type, questionIndex) {
  const probes = [
    'Can you walk me through the specific steps you would take to implement that?',
    'What failure modes or edge cases would you need to handle in that approach?',
    'How would your solution behave if the load increased by 10x?',
    'What trade-offs does your approach make, and when would you choose a different solution?',
    'How would you monitor this in production to know it is working correctly?',
  ];
  return {
    text: probes[questionIndex % probes.length],
    type,
    context: null,
    difficulty: 'medium',
  };
}

function getFallbackFeedback(questions, answers) {
  console.log(`[GEMINI] 📋 Serving default template feedback for ${questions.length} questions`);
  return {
    questionFeedback: questions.map((q, i) => ({
      question: q.text,
      answer: answers[i]?.answer || '',
      score: 70,
      feedback: 'Your answer shows reasonable understanding. Consider providing more specific examples and structuring your response with clear reasoning.',
      tips: 'Try to explicitly state trade-offs and mention how you would handle failure scenarios.',
    })),
    strengths: [
      'Demonstrated ability to communicate technical ideas',
      'Showed problem-solving initiative',
      'Clear understanding of basic concepts',
    ],
    improvements: [
      'Provide more specific examples from real experience',
      'Quantify impact of solutions with concrete metrics',
      'Discuss trade-offs and failure modes proactively',
    ],
    technicalScore: 70,
    communicationScore: 72,
    confidenceScore: 65,
    relevanceScore: 70,
    depthScore: 65,
    overallFeedback: 'You demonstrated solid fundamentals. Focus on adding depth to answers with concrete trade-offs, failure scenarios, and measurable outcomes.',
    score: 70,
  };
}
