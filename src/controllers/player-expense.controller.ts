import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  getPlayerExpenseDetailsByPlayerId,
  getPlayerExpenseSummaryByUserId
} from '../services/player-expense.service';
import { AppError } from '../utils/AppError';
import { playerParamsSchema } from '../validators/player.validator';

const getAuthenticatedUserId = (req: Request): number => {
  if (!req.user) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  return req.user.userId;
};

const handleValidationError = (error: unknown, next: NextFunction): boolean => {
  if (error instanceof ZodError) {
    next(new AppError(error.errors[0]?.message ?? 'Invalid request', HTTP_STATUS.BAD_REQUEST));
    return true;
  }

  return false;
};

export const getPlayerExpenseSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const summary = await getPlayerExpenseSummaryByUserId(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

export const getPlayerExpenseDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = playerParamsSchema.parse(req.params);
    const details = await getPlayerExpenseDetailsByPlayerId(userId, params.playerId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: details
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
