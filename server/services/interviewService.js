import { generateQuestions, generateFeedback } from './gemini.js';
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

  if (!role || !type || !experience) {
    console.warn(`[SERVICE:interview] ❌ createInterview validation failed: Missing required fields (role: ${role}, type: ${type}, experience: ${experience})`);
    throw createHttpError(400, 'Role, type, and experience are required');
  }

  const created = await createInterviewRecord(userId, payload);
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

  const currentQuestions = interview.questions || [];

  if (currentQuestions.length > 0) {
    console.log(`[SERVICE:interview] ℹ️ Interview "${id}" already has ${currentQuestions.length} questions. Reusing existing questions.`);
    return currentQuestions;
  }

  console.log(`[SERVICE:interview] 🤖 Invoking Gemini to generate ${interview.questionCount || 5} questions for role="${interview.role}", type="${interview.type}", level="${interview.experience}"...`);
  const questions = await generateQuestions(
    interview.role,
    interview.type,
    interview.experience,
    interview.jobDescription,
    interview.focusArea,
    interview.questionCount
  );

  console.log(`[SERVICE:interview] 💾 Saving generated ${questions.length} questions to interview "${id}" and transitioning status to 'in_progress'...`);
  interview.questions = questions;
  interview.status = 'in_progress';
  await saveInterviewRecord(userId, interview);

  console.log(`[SERVICE:interview] ✅ Questions successfully generated and saved for interview "${id}"`);
  return questions;
}

export async function submitInterviewAnswers(userId, id, answers) {
  console.log(`[SERVICE:interview] 📝 submitInterviewAnswers: Submitting answers for interview "${id}" (userId: "${userId}")`);
  const interview = await getInterviewById(userId, id);

  if (!Array.isArray(answers)) {
    console.warn(`[SERVICE:interview] ❌ submitInterviewAnswers failed: "answers" is not an array (type: ${typeof answers})`);
    throw createHttpError(400, 'Answers must be an array');
  }

  const interviewQuestions = interview.questions || [];
  console.log(`[SERVICE:interview] Mapping ${answers.length} answers against ${interviewQuestions.length} questions for interview "${id}"`);

  interview.answers = answers.map((answer, index) => ({
    questionId: interviewQuestions[index]?._id,
    question: answer.question,
    answer: answer.answer,
  }));

  console.log(`[SERVICE:interview] 🤖 Requesting AI feedback and scoring from Gemini...`);
  const feedback = await generateFeedback(interviewQuestions, interview.answers);

  interview.feedback = {
    strengths: feedback.strengths || [],
    improvements: feedback.improvements || [],
    technicalScore: feedback.technicalScore || 0,
    communicationScore: feedback.communicationScore || 0,
    confidenceScore: feedback.confidenceScore || 0,
    relevanceScore: feedback.relevanceScore || 0,
    depthScore: feedback.depthScore || 0,
    overallFeedback: feedback.overallFeedback || '',
  };

  if (feedback.questionFeedback) {
    interview.answers = interview.answers.map((answer, index) => {
      const plainAnswer = typeof answer?.toObject === 'function' ? answer.toObject() : answer;

      return {
        ...plainAnswer,
        score: feedback.questionFeedback[index]?.score || 0,
        feedback: feedback.questionFeedback[index]?.feedback || '',
        tips: feedback.questionFeedback[index]?.tips || '',
      };
    });
  }

  interview.score = feedback.score || 0;
  interview.duration = interview.questionCount * 2;
  interview.status = 'completed';
  interview.completedAt = new Date();

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
    })),
    strengths: interview.feedback?.strengths || [],
    improvements: interview.feedback?.improvements || [],
    technicalScore: interview.feedback?.technicalScore || 0,
    communicationScore: interview.feedback?.communicationScore || 0,
    confidenceScore: interview.feedback?.confidenceScore || 0,
    relevanceScore: interview.feedback?.relevanceScore || 0,
    depthScore: interview.feedback?.depthScore || 0,
    overallFeedback: interview.feedback?.overallFeedback || '',
  };
}

export async function deleteInterview(userId, id) {
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
