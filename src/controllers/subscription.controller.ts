import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  getActiveSubscriptionPlans,
  getCurrentSubscription
} from '../services/subscription.service';
import { AppError } from '../utils/AppError';

export const getMySubscription = async (
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

    if (!subscription) {
      next(new AppError('Active subscription not found', HTTP_STATUS.NOT_FOUND));
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      subscription: {
        planCode: subscription.planCode,
        planName: subscription.planName,
        status: subscription.status,
        isPaid: subscription.isPaid,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    const plans = await getActiveSubscriptionPlans();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      plans
    });
  } catch (error) {
    next(error);
  }
};
