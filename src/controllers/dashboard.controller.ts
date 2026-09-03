import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { getDashboardSummaryByUserId } from '../services/dashboard.service';
import { AppError } from '../utils/AppError';

const getAuthenticatedUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  return req.user.userId;
};

export const getDashboardSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const summary = await getDashboardSummaryByUserId(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Dashboard summary fetched successfully',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
