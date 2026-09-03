import { Router } from 'express';
import { getDashboardSummaryController } from '../controllers/dashboard.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/dashboard', authenticateJwt);

router.get('/dashboard/summary', getDashboardSummaryController);

export default router;
