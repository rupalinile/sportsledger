import { NextFunction, Request, RequestHandler, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  getCurrentSubscription,
  getLatestExpiredPaidSubscription,
  hasFeature
} from '../services/subscription.service';
import {
  PAID_SUBSCRIPTION_PLAN_CODES,
  SubscriptionFeatureCode,
  SubscriptionPlanCode
} from '../types/subscription.types';
import { AppError } from '../utils/AppError';

type SubscriptionErrorCode =
  | 'SUBSCRIPTION_REQUIRED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'FEATURE_NOT_AVAILABLE';

type SubscriptionErrorResponse = {
  success: false;
  code: SubscriptionErrorCode;
  message: string;
};

const isPaidPlanCode = (planCode: SubscriptionPlanCode): boolean =>
  PAID_SUBSCRIPTION_PLAN_CODES.some((paidPlanCode) => paidPlanCode === planCode);

const sendSubscriptionError = (
  res: Response,
  code: SubscriptionErrorCode,
  message: string
): Response<SubscriptionErrorResponse> =>
  res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    code,
    message
  });

export const requireSubscription = (
  ...allowedPlans: SubscriptionPlanCode[]
): RequestHandler => async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    const subscription = await getCurrentSubscription(req.user.userId);

    if (subscription) {
      req.subscription = subscription;
    }

    if (
      subscription &&
      !subscription.isExpired &&
      allowedPlans.includes(subscription.planCode)
    ) {
      next();
      return;
    }

    const requiresPaidPlan = allowedPlans.some(isPaidPlanCode);

    if (requiresPaidPlan) {
      const latestPaidSubscription = await getLatestExpiredPaidSubscription(req.user.userId);

      if (latestPaidSubscription?.isExpired) {
        sendSubscriptionError(
          res,
          'SUBSCRIPTION_EXPIRED',
          'Your subscription has expired'
        );
        return;
      }
    }

    sendSubscriptionError(
      res,
      'SUBSCRIPTION_REQUIRED',
      'This feature requires a paid subscription'
    );
  } catch (error) {
    next(error);
  }
};

export const requireFeature = (featureCode: SubscriptionFeatureCode): RequestHandler => async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    const subscription = await getCurrentSubscription(req.user.userId);

    if (subscription) {
      req.subscription = subscription;
    }

    const featureAllowed = await hasFeature(req.user.userId, featureCode);

    if (featureAllowed) {
      next();
      return;
    }

    sendSubscriptionError(
      res,
      'FEATURE_NOT_AVAILABLE',
      'This feature is not available with your current subscription'
    );
  } catch (error) {
    next(error);
  }
};
