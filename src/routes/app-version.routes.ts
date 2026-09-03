import { Router } from 'express';
import { checkAppVersionController } from '../controllers/app-version.controller';

const router = Router();

router.get('/app/version-check', checkAppVersionController);

export default router;
