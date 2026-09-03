import { Router } from 'express';
import {
  createTeamTransactionController,
  deleteTeamTransactionController,
  getTeamExpenseSummaryController,
  getTeamTransactionDetailController,
  getTeamTransactionsController,
  updateTeamTransactionController
} from '../controllers/team-expense.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/team-expenses', authenticateJwt);

router.post('/team-expenses/transactions', createTeamTransactionController);
router.get(
  '/team-expenses/transactions/detail/:transactionId',
  getTeamTransactionDetailController
);
router.put('/team-expenses/transactions/:transactionId', updateTeamTransactionController);
router.delete('/team-expenses/transactions/:transactionId', deleteTeamTransactionController);
router.get('/team-expenses/transactions/:teamId', getTeamTransactionsController);
router.get('/team-expenses/summary/:teamId', getTeamExpenseSummaryController);

export default router;
