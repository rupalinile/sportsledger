import { Router } from 'express';
import {
  cancelMatchController,
  completeMatchController,
  createMatchController,
  getMatchController,
  getMatchPlayersController,
  getSettledMatchesController,
  getScheduledMatchesController,
  updateMatchController
} from '../controllers/match.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/matches', authenticateJwt);

router.get('/matches/settled', getSettledMatchesController);
router.get('/matches/scheduled', getScheduledMatchesController);
router.patch('/matches/:id/cancel', cancelMatchController);
router.patch('/matches/:id/complete', completeMatchController);
router.get('/matches/:id/players', getMatchPlayersController);
router.get('/matches/:id', getMatchController);
router.put('/matches/:id', updateMatchController);
router.post('/matches', createMatchController);

export default router;
