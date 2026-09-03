import { Router } from 'express';
import {
  getPlayerExpenseDetailsController,
  getPlayerExpenseSummaryController
} from '../controllers/player-expense.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/player-expenses', authenticateJwt);

router.get('/player-expenses/summary', getPlayerExpenseSummaryController);
router.get('/player-expenses/:playerId', getPlayerExpenseDetailsController);

export default router;
