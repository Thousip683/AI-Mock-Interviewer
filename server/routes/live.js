import { Router } from 'express';
import { aiUsage } from '../middleware/usage.js';
import auth from '../middleware/auth.js';
import { createLiveTicket, finishLiveInterview } from '../services/liveInterviewService.js';

const router = Router();
router.post('/:id/live-session', auth, aiUsage, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(await createLiveTicket(req.userId, req.params.id));
  } catch (error) { next(error); }
});
router.post('/:id/live-finish', auth, aiUsage, async (req, res, next) => {
  try { res.json(await finishLiveInterview(req.userId, req.params.id)); }
  catch (error) { next(error); }
});
export default router;
