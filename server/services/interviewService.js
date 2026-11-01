import { generateQuestions, generateFollowUp, generateFeedback } from './gemini.js';
import { isLiveBusy, reserveLive } from './liveSessions.js';
import {
  listInterviewsByUser,
  getStatsByUser,
  createInterviewRecord,
  getInterviewRecord,
  saveInterviewRecord,
  deleteInterviewRecord,
} from '../repositories/interviewRepository.js';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function getUserInterviews(userId) {
  console.log(`[SERVICE:interview] 📋 getUserInterviews: Fetching interviews for userId: "${userId}"`);
  if (!userId) {
    console.warn('[SERVICE:interview] ❌ getUserInterviews failed: Missing userId (Authentication required)');
    throw createHttpError(401, 'Authentication required');
  }

  return listInterviewsByUser(userId);
}

export function getInterviewStats(userId) {
  console.log(`[SERVICE:interview] 📊 getInterviewStats: Calculating stats for userId: "${userId}"`);
  if (!userId) {
    console.warn('[SERVICE:interview] ❌ getInterviewStats failed: Missing userId (Authentication required)');
    throw createHttpError(401, 'Authentication required');
  }

  return getStatsByUser(userId);
}

export async function createInterview(userId, payload) {
  console.log(`[SERVICE:interview] ➕ createInterview: Creating new interview for userId: "${userId}" with payload:`, {
    role: payload?.role,
    type: payload?.type,
    experience: payload?.experience,
    questionCount: payload?.questionCount || 5,
  });

  if (!userId) {
    console.warn('[SERVICE:interview] ❌ createInterview failed: Missing userId');
    throw createHttpError(401, 'Authentication required');
  }

  const { role, type, experience } = payload || {};

  if (payload?.mode !== undefined && !['standard', 'live'].includes(payload.mode)) {
    throw createHttpError(400, 'Invalid interview mode');
  }
  const count = Number(payload?.questionCount ?? 5);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw createHttpError(400, 'Choose between 1 and 20 questions');
  for (const [field, limit] of Object.entries({ role: 200, type: 30, experience: 30, jobDescription: 12000, focusArea: 2000 })) {
    if (payload?.[field] !== undefined && (typeof payload[field] !== 'string' || payload[field].length > limit)) throw createHttpError(400, `${field} must be text of at most ${limit} characters`);
  }
  if (!['general', 'technical', 'behavioral', 'system-design'].includes(type)) throw createHttpError(400, 'Choose a valid interview type');
  if (!['entry', 'mid', 'senior', 'lead'].includes(experience)) throw createHttpError(400, 'Choose a valid experience level');

  if (!role?.trim() || !type || !experience) {
    console.warn(`[SERVICE:interview] ❌ createInterview validation failed: Missing required fields (role: ${role}, type: ${type}, experience: ${experience})`);
    throw createHttpError(400, 'Role, type, and experience are required');
  }

  const created = await createInterviewRecord(userId, { ...payload, role: role.trim(), questionCount: count });
  console.log(`[SERVICE:interview] ✅ createInterview: Successfully created interview record with ID: "${created._id || created.id}"`);
  return created;
}

export async function getInterviewById(userId, id) {
  console.log(`[SERVICE:interview] 🔍 getInterviewById: Fetching interview "${id}" for user "${userId}"`);
  if (!userId) {
    console.warn('[SERVICE:interview] ❌ getInterviewById failed: Missing userId');
    throw createHttpError(401, 'Authentication required');
  }

  const interview = await getInterviewRecord(userId, id);

  if (!interview) {
    console.warn(`[SERVICE:interview] ❌ getInterviewById: Interview "${id}" not found for user "${userId}"`);
    throw createHttpError(404, 'Interview not found');
  }

  console.log(`[SERVICE:interview] ✅ getInterviewById: Found interview "${id}" (role: "${interview.role}", status: "${interview.status}")`);
  return interview;
}

export async function getInterviewQuestions(userId, id) {
  console.log(`[SERVICE:interview] ❓ getInterviewQuestions: Fetching questions for interview "${id}"`);
  const interview = await getInterviewById(userId, id);
  const questions = [...(interview.questions || [])].sort((a, b) => a.order - b.order);
  console.log(`[SERVICE:interview] ✅ getInterviewQuestions: Found ${questions.length} existing questions for interview "${id}"`);
  return questions;
}

export async function generateInterviewQuestions(userId, id) {
  console.log(`[SERVICE:interview] ⚡ generateInterviewQuestions: Requested for interview "${id}" (userId: "${userId}")`);
  const interview = await getInterviewById(userId, id);
  if (interview.mode === 'live') throw createHttpError(400, 'Start a live voice session for this interview');

  const currentQuestions = interview.questions || [];

  if (currentQuestions.length > 0) {
    console.log(`[SERVICE:interview] ℹ️ Interview "${id}" already has ${currentQuestions.length} questions. Reusing existing questions.`);
    return currentQuestions;
  }

  console.log(`[SERVICE:interview] 🤖 Generating opening question for role="${interview.role}", type="${interview.type}", level="${interview.experience}"...`);
  // generateQuestions now returns a 1-element array (opening question only)
  const questions = await generateQuestions(
    interview.role,
    interview.type,
    interview.experience,
    interview.jobDescription,
    interview.focusArea,
    interview.questionCount
  );

  console.log(`[SERVICE:interview] 💾 Saving opening question to interview "${id}" and transitioning status to 'in_progress'...`);
  interview.questions = questions;
  interview.status = 'in_progress';
  await saveInterviewRecord(userId, interview);

  console.log(`[SERVICE:interview] ✅ Opening question generated and saved for interview "${id}"`);
  return questions;
}

/**
 * Generates an adaptive follow-up question based on conversation history.
 * Called after the candidate answers each question (except the last).
 * Also persists the answered question+answer into conversationHistory.
 */
export async function generateFollowUpQuestion(userId, id, { previousQuestion, previousAnswer, questionIndex }) {
  console.log(`[SERVICE:interview] 🔁 generateFollowUpQuestion: interview "${id}", questionIndex=${questionIndex}`);

  if (typeof previousQuestion !== 'string' || !previousQuestion.trim()) {
    throw createHttpError(400, 'previousQuestion is required');
  }
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    throw createHttpError(400, 'questionIndex must be a non-negative integer');
  }

  const interview = await getInterviewById(userId, id);
  if (interview.mode === 'live') throw createHttpError(400, 'Use the live voice session for this interview');
  const maxQuestions = interview.questionCount || 5;
  const currentQuestion = interview.questions?.[questionIndex];
  if (!currentQuestion || previousQuestion !== currentQuestion.text || questionIndex >= maxQuestions) throw createHttpError(400, 'Invalid current question');
  if (typeof previousAnswer !== 'string') throw createHttpError(400, 'previousAnswer must be text');
  const draftAnswers = [...(interview.answers || [])];
  draftAnswers[questionIndex] = { question: currentQuestion.text, answer: previousAnswer.trim(), questionId: currentQuestion._id };

  // Build updated conversation history (cap at 10 to stay within token budget)
  const existingHistory = interview.conversationHistory || [];
  const updatedHistory = [
    ...existingHistory.filter(turn => turn.order !== questionIndex),
    {
      question: previousQuestion,
      answer: (previousAnswer || '').trim(),
      order: questionIndex,
    },
  ].slice(-10);

  // If we've reached the question limit, signal completion without AI call
  if (questionIndex >= maxQuestions - 1) {
    console.log(`[SERVICE:interview] ✅ Interview "${id}" reached questionCount=${maxQuestions}. Signaling completion.`);
    // Persist the updated conversation history
    await saveInterviewRecord(userId, { ...interview, answers: draftAnswers, conversationHistory: updatedHistory });
    return { isComplete: true, question: null };
  }

  const existingNext = interview.questions?.[questionIndex + 1];
  if (existingNext) {
    await saveInterviewRecord(userId, { ...interview, answers: draftAnswers, conversationHistory: updatedHistory });
    return { question: existingNext, isComplete: false };
  }

  console.log(`[SERVICE:interview] 🤖 Requesting adaptive follow-up from Gemini (${updatedHistory.length} turns so far)...`);
  const followUp = await generateFollowUp({
    role: interview.role,
    type: interview.type,
    experience: interview.experience,
    conversationHistory: updatedHistory,
    questionIndex: questionIndex + 1, // next question index
    maxQuestions,
  });

  // Append the new question to the interview's questions array and save updated history
  const newQuestion = {
    text: followUp.text,
    type: followUp.type || interview.type,
    context: followUp.context || null,
    difficulty: followUp.difficulty || 'medium',
    order: (interview.questions || []).length + 1,
  };

  const updatedQuestions = [...(interview.questions || []), newQuestion];
  await saveInterviewRecord(userId, {
    ...interview,
    questions: updatedQuestions,
    answers: draftAnswers,
    conversationHistory: updatedHistory,
  });

  console.log(`[SERVICE:interview] ✅ Follow-up question saved to interview "${id}"; awaiting candidate answer`);
  return {
    question: newQuestion,
    // A generated question still needs an answer, including the final one.
    // Only the question-limit branch above may tell the client to submit.
    isComplete: false,
  };
}

export async function submitInterviewAnswers(userId, id, answers, { fromLive = false } = {}) {
  console.log(`[SERVICE:interview] 📝 submitInterviewAnswers: Submitting answers for interview "${id}" (userId: "${userId}")`);
  const interview = await getInterviewById(userId, id);
  if (interview.mode === 'live' && !fromLive) throw createHttpError(400, 'End the live interview to generate feedback');

  if (!Array.isArray(answers)) {
    console.warn(`[SERVICE:interview] ❌ submitInterviewAnswers failed: "answers" is not an array (type: ${typeof answers})`);
    throw createHttpError(400, 'Answers must be an array');
  }

  const interviewQuestions = interview.questions || [];
  if (!interviewQuestions.length || answers.length !== interviewQuestions.length || answers.some(answer => !answer || typeof answer.answer !== 'string' || answer.answer.length > 30000)) {
    throw createHttpError(400, 'Provide one text answer per question (maximum 30000 characters each)');
  }
  console.log(`[SERVICE:interview] Mapping ${answers.length} answers against ${interviewQuestions.length} questions for interview "${id}"`);

  interview.answers = answers.map((answer, index) => ({
    questionId: interviewQuestions[index]?._id,
    question: interviewQuestions[index].text,
    answer: answer.answer,
  }));

  console.log(`[SERVICE:interview] 🤖 Requesting AI feedback and scoring from Gemini...`);
  const feedback = await generateFeedback(interviewQuestions, interview.answers, {
    role: interview.role,
    type: interview.type,
    experience: interview.experience,
  });

  if (interview.status === 'completed' && feedback.evaluationSource === 'heuristic') {
    throw createHttpError(503, 'AI evaluation is unavailable. Your existing saved report has been kept. Try again later.');
  }

  interview.feedback = {
    strengths: feedback.strengths || [],
    improvements: feedback.improvements || [],
    technicalScore: feedback.technicalScore || 0,
    communicationScore: feedback.communicationScore || 0,
    confidenceScore: feedback.confidenceScore || 0,
    relevanceScore: feedback.relevanceScore || 0,
    depthScore: feedback.depthScore || 0,
    overallFeedback: feedback.overallFeedback || '',
    roadmap: feedback.roadmap || [],
  };

  if (feedback.questionFeedback) {
    interview.answers = interview.answers.map((answer, index) => {
      const plainAnswer = typeof answer?.toObject === 'function' ? answer.toObject() : answer;

      return {
        ...plainAnswer,
        score: feedback.questionFeedback[index]?.score || 0,
        feedback: feedback.questionFeedback[index]?.feedback || '',
        tips: feedback.questionFeedback[index]?.tips || '',
        verdict: feedback.questionFeedback[index]?.verdict || '',
        correctAnswer: feedback.questionFeedback[index]?.correctAnswer || '',
        missingConcepts: feedback.questionFeedback[index]?.missingConcepts || [],
        studyPoints: feedback.questionFeedback[index]?.studyPoints || [],
        summary: feedback.questionFeedback[index]?.summary || '',
        practiceTask: feedback.questionFeedback[index]?.practiceTask || '',
      };
    });
  }

  interview.score = feedback.score || 0;
  interview.evaluationSource = feedback.evaluationSource;
  interview.duration = fromLive ? Math.round((interview.liveDurationSeconds || 0) / 60) : interview.questionCount * 2;
  interview.status = 'completed';
  interview.completedAt = interview.completedAt || new Date();

  console.log(`[SERVICE:interview] 💾 Saving completed interview results: overallScore=${interview.score}, status="completed"`);
  await saveInterviewRecord(userId, interview);

  console.log(`[SERVICE:interview] ✅ Interview "${id}" submitted and evaluated successfully.`);
  return { score: interview.score };
}

export async function getInterviewFeedback(userId, id) {
  console.log(`[SERVICE:interview] 🏆 getInterviewFeedback: Fetching feedback for interview "${id}"`);
  const interview = await getInterviewById(userId, id);

  if (interview.status !== 'completed') {
    console.warn(`[SERVICE:interview] ❌ getInterviewFeedback failed: Interview "${id}" status is "${interview.status}", expected "completed"`);
    throw createHttpError(400, 'Interview not completed yet');
  }

  console.log(`[SERVICE:interview] ✅ getInterviewFeedback: Returning feedback for interview "${id}" (score: ${interview.score}/100)`);
  return {
    score: interview.score,
    mode: interview.mode || 'standard',
    evaluationSource: interview.evaluationSource,
    role: interview.role,
    type: interview.type,
    date: interview.completedAt || interview.updatedAt,
    answered: (interview.answers || []).filter((answer) => answer.answer).length,
    total: (interview.questions || []).length,
    questionFeedback: (interview.answers || []).map((answer) => ({
      question: answer.question,
      answer: answer.answer,
      score: answer.score,
      feedback: answer.feedback,
      tips: answer.tips,
      verdict: answer.verdict,
      correctAnswer: answer.correctAnswer,
      missingConcepts: answer.missingConcepts || [],
      studyPoints: answer.studyPoints || [],
      summary: answer.summary,
      practiceTask: answer.practiceTask,
    })),
    strengths: interview.feedback?.strengths || [],
    improvements: interview.feedback?.improvements || [],
    technicalScore: interview.feedback?.technicalScore || 0,
    communicationScore: interview.feedback?.communicationScore || 0,
    confidenceScore: interview.feedback?.confidenceScore || 0,
    relevanceScore: interview.feedback?.relevanceScore || 0,
    depthScore: interview.feedback?.depthScore || 0,
    overallFeedback: interview.feedback?.overallFeedback || '',
    roadmap: interview.feedback?.roadmap || [],
  };
}

export async function deleteInterview(userId, id) {
  if (isLiveBusy(id)) throw createHttpError(409, 'End the live session before deleting this interview');
  console.log(`[SERVICE:interview] 🗑️ deleteInterview: Requesting deletion of interview "${id}" for user "${userId}"`);
  if (!userId) {
    console.warn('[SERVICE:interview] ❌ deleteInterview failed: Missing userId');
    throw createHttpError(401, 'Authentication required');
  }

  const interview = await deleteInterviewRecord(userId, id);

  if (!interview) {
    console.warn(`[SERVICE:interview] ❌ deleteInterview: Interview "${id}" not found for user "${userId}"`);
    throw createHttpError(404, 'Interview not found');
  }

  console.log(`[SERVICE:interview] ✅ deleteInterview: Interview "${id}" deleted successfully`);
  return interview;
}

export async function refreshInterviewFeedback(userId, id) {
  const interview = await getInterviewById(userId, id);
  if (interview.status !== 'completed') throw createHttpError(400, 'Complete the interview first');
  const release = reserveLive(id);
  try {
    await submitInterviewAnswers(userId, id, interview.answers || [], { fromLive: interview.mode === 'live' });
    return await getInterviewFeedback(userId, id);
  } finally { release(); }
}
