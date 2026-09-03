import { Router } from 'express';
import {
  createTeamController,
  getTeamController,
  getTeamsController,
  updateTeamController
} from '../controllers/team.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/teams', authenticateJwt);

router.post('/teams', createTeamController);
router.get('/teams', getTeamsController);
router.get('/teams/:teamId', getTeamController);
router.put('/teams/:teamId', updateTeamController);

export default router;
