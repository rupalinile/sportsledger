import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import healthRoutes from './health.routes';
import matchRoutes from './match.routes';
import playerDepositRoutes from './player-deposit.routes';
import playerExpenseRoutes from './player-expense.routes';
import playerRoutes from './player.routes';
import subscriptionRoutes from './subscription.routes';
import teamExpenseRoutes from './team-expense.routes';
import teamRoutes from './team.routes';

const router = Router();

router.use(authRoutes);
router.use(dashboardRoutes);
router.use(healthRoutes);
router.use(subscriptionRoutes);
router.use(teamRoutes);
router.use(playerRoutes);
router.use(playerDepositRoutes);
router.use(playerExpenseRoutes);
router.use(teamExpenseRoutes);
router.use(matchRoutes);

export default router;
