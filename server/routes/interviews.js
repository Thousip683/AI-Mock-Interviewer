import { getInterviewById } from '../services/interviewService.js';
import { generatePreparation } from '../services/gemini.js';
import { refreshInterviewFeedback } from '../services/interviewService.js';
import express from 'express';
import auth from '../middleware/auth.js';
import {
  listInterviews,
  listInterviewStats,
  createInterviewHandler,
  getInterviewHandler,
  getInterviewQuestionsHandler,
  generateInterviewQuestionsHandler,
  generateFollowUpHandler,
  submitInterviewAnswersHandler,
  getInterviewFeedbackHandler,
  deleteInterviewHandler,
} from '../controllers/interviewController.js';

const router = express.Router();

router.get('/', auth, listInterviews);
router.get('/stats', auth, listInterviewStats);
router.post('/', auth, createInterviewHandler);
router.get('/:id', auth, getInterviewHandler);
router.post('/:id/preparation', auth, async (req, res, next) => {
  try {
    const interview = await getInterviewById(req.userId, req.params.id);
    try { res.json(await generatePreparation(interview)); }
    catch { res.status(503).json({ error: 'The study guide could not be generated. Please retry, or start your interview without it.' }); }
  } catch (error) { next(error); }
});
router.get('/:id/questions', auth, getInterviewQuestionsHandler);
router.post('/:id/generate', auth, generateInterviewQuestionsHandler);
// Adaptive follow-up: POST /interviews/:id/followup
// Body: { previousQuestion, previousAnswer, questionIndex }
// Returns: { question: {...}, isComplete: boolean }
router.post('/:id/followup', auth, generateFollowUpHandler);
router.post('/:id/submit', auth, submitInterviewAnswersHandler);
router.get('/:id/feedback', auth, getInterviewFeedbackHandler);
router.post('/:id/feedback/refresh', auth, async (req, res, next) => {
  try { res.json(await refreshInterviewFeedback(req.userId, req.params.id)); }
  catch (error) { next(error); }
});
router.delete('/:id', auth, deleteInterviewHandler);

export default router;
