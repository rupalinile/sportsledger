import { Router } from 'express';
import {
  createPlayerController,
  deletePlayerController,
  getPlayerController,
  getPlayersController,
  updatePlayerController
} from '../controllers/player.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use('/players', authenticateJwt);

router.post('/players', createPlayerController);
router.get('/players', getPlayersController);
router.get('/players/:playerId', getPlayerController);
router.put('/players/:playerId', updatePlayerController);
router.delete('/players/:playerId', deletePlayerController);

export default router;
