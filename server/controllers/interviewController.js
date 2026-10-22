import {
  getUserInterviews,
  getInterviewStats,
  createInterview,
  getInterviewById,
  getInterviewQuestions,
  generateInterviewQuestions,
  generateFollowUpQuestion,
  submitInterviewAnswers,
  getInterviewFeedback,
  deleteInterview,
} from '../services/interviewService.js';

const asyncHandler = (name, fn) => (req, res, next) => {
  console.log(`[CONTROLLER:interview] 📥 Received request: [${req.method} ${req.originalUrl}] (Handler: ${name})`);
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[CONTROLLER:interview] ❌ Error in handler "${name}" for [${req.method} ${req.originalUrl}]: ${err.message}`);
    next(err);
  });
};

export const listInterviews = asyncHandler('listInterviews', async (req, res) => {
  console.log(`[CONTROLLER:interview] 📋 Fetching all interviews for userId: "${req.userId}"`);
  const interviews = await getUserInterviews(req.userId);
  console.log(`[CONTROLLER:interview] 📤 Returning ${interviews.length} interviews to client`);
  res.json(interviews);
});

export const listInterviewStats = asyncHandler('listInterviewStats', async (req, res) => {
  console.log(`[CONTROLLER:interview] 📊 Fetching interview statistics for userId: "${req.userId}"`);
  const stats = await getInterviewStats(req.userId);
  const payload = stats || { total: 0, completed: 0, averageScore: 0 };
  console.log(`[CONTROLLER:interview] 📤 Returning interview stats to client:`, payload);
  res.json(payload);
});

export const createInterviewHandler = asyncHandler('createInterviewHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] ➕ Creating new interview for userId: "${req.userId}" with body:`, req.body);
  const interview = await createInterview(req.userId, req.body);
  console.log(`[CONTROLLER:interview] 📤 Created interview with ID: "${interview._id || interview.id}". Responding 201 Created.`);
  res.status(201).json(interview);
});

export const getInterviewHandler = asyncHandler('getInterviewHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] 🔍 Fetching details for interview ID: "${req.params.id}"`);
  const interview = await getInterviewById(req.userId, req.params.id);
  console.log(`[CONTROLLER:interview] 📤 Returning interview details for ID: "${req.params.id}"`);
  res.json(interview);
});

export const getInterviewQuestionsHandler = asyncHandler('getInterviewQuestionsHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] ❓ Fetching questions for interview ID: "${req.params.id}"`);
  const questions = await getInterviewQuestions(req.userId, req.params.id);
  console.log(`[CONTROLLER:interview] 📤 Returning ${questions.length} questions for interview ID: "${req.params.id}"`);
  res.json(questions);
});

export const generateInterviewQuestionsHandler = asyncHandler('generateInterviewQuestionsHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] ⚡ Request to generate opening question for interview ID: "${req.params.id}"`);
  const questions = await generateInterviewQuestions(req.userId, req.params.id);
  console.log(`[CONTROLLER:interview] 📤 Returning ${questions.length} question(s) for interview ID: "${req.params.id}"`);
  res.json(questions);
});

/**
 * POST /interviews/:id/followup
 * Body: { previousQuestion, previousAnswer, questionIndex }
 * Response: { question: {...}, isComplete: boolean }
 */
export const generateFollowUpHandler = asyncHandler('generateFollowUpHandler', async (req, res) => {
  const { previousQuestion, previousAnswer, questionIndex } = req.body;
  console.log(`[CONTROLLER:interview] 🔁 Follow-up requested for interview "${req.params.id}", questionIndex=${questionIndex}`);

  const result = await generateFollowUpQuestion(req.userId, req.params.id, {
    previousQuestion,
    previousAnswer,
    questionIndex: Number(questionIndex),
  });

  console.log(`[CONTROLLER:interview] 📤 Follow-up result: isComplete=${result.isComplete}, question="${result.question?.text?.substring(0, 60) || 'N/A'}..."`);
  res.json(result);
});

export const submitInterviewAnswersHandler = asyncHandler('submitInterviewAnswersHandler', async (req, res) => {
  const answerCount = Array.isArray(req.body?.answers) ? req.body.answers.length : 0;
  console.log(`[CONTROLLER:interview] 📝 Submitting ${answerCount} answers for interview ID: "${req.params.id}"`);
  const result = await submitInterviewAnswers(req.userId, req.params.id, req.body.answers);
  console.log(`[CONTROLLER:interview] 📤 Submission evaluated successfully. Final score: ${result.score}/100`);
  res.json({ success: true, score: result.score });
});

export const getInterviewFeedbackHandler = asyncHandler('getInterviewFeedbackHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] 🏆 Fetching feedback report for interview ID: "${req.params.id}"`);
  const feedback = await getInterviewFeedback(req.userId, req.params.id);
  console.log(`[CONTROLLER:interview] 📤 Returning feedback report (Score: ${feedback.score}/100, Strengths: ${feedback.strengths?.length || 0})`);
  res.json(feedback);
});

export const deleteInterviewHandler = asyncHandler('deleteInterviewHandler', async (req, res) => {
  console.log(`[CONTROLLER:interview] 🗑️ Deleting interview ID: "${req.params.id}"`);
  await deleteInterview(req.userId, req.params.id);
  console.log(`[CONTROLLER:interview] 📤 Interview ID: "${req.params.id}" successfully deleted`);
  res.json({ message: 'Interview deleted successfully' });
});
