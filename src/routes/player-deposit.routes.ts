import { Router } from 'express';
import {
  createPlayerDepositController,
  getPlayerDepositsController,
  updatePlayerDepositController
} from '../controllers/player-deposit.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/player-deposits', authenticateJwt);

router.post('/player-deposits', createPlayerDepositController);
router.get('/player-deposits', getPlayerDepositsController);
router.put('/player-deposits/:depositId', updatePlayerDepositController);

export default router;
