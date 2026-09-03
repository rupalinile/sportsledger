import { Router } from 'express';
import {
  getMySubscription,
  getSubscriptionPlans
} from '../controllers/subscription.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { requireSubscription } from '../middleware/subscription.middleware';
import { SUBSCRIPTION_PLAN_CODES } from '../types/subscription.types';

const router = Router();

router.get('/subscriptions/me', authenticateJwt, getMySubscription);
router.get('/subscriptions/plans', authenticateJwt, getSubscriptionPlans);

router.get(
  '/subscription/test/free',
  authenticateJwt,
  requireSubscription(
    SUBSCRIPTION_PLAN_CODES.FREE,
    SUBSCRIPTION_PLAN_CODES.MONTHLY,
    SUBSCRIPTION_PLAN_CODES.YEARLY
  ),
  (req, res) => {
    res.json({
      success: true,
      message: 'Subscription access allowed',
      subscription: req.subscription
    });
  }
);

router.get(
  '/subscription/test/paid',
  authenticateJwt,
  requireSubscription(
    SUBSCRIPTION_PLAN_CODES.MONTHLY,
    SUBSCRIPTION_PLAN_CODES.YEARLY
  ),
  (req, res) => {
    res.json({
      success: true,
      message: 'Paid subscription access allowed',
      subscription: req.subscription
    });
  }
);

router.get(
  '/subscription/test/yearly',
  authenticateJwt,
  requireSubscription(SUBSCRIPTION_PLAN_CODES.YEARLY),
  (req, res) => {
    res.json({
      success: true,
      message: 'Yearly subscription access allowed',
      subscription: req.subscription
    });
  }
);

export default router;
