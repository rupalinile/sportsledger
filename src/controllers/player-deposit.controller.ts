import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createPlayerDeposit,
  getPlayerDepositsByUserId,
  updatePlayerDepositForUser
} from '../services/player-deposit.service';
import { AppError } from '../utils/AppError';
import {
  createPlayerDepositBodySchema,
  playerDepositQuerySchema,
  playerDepositParamsSchema
} from '../validators/player-deposit.validator';

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

export const createPlayerDepositController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const payload = createPlayerDepositBodySchema.parse(req.body);
    const deposit = await createPlayerDeposit(userId, {
      playerId: payload.player_id,
      depositDate: payload.deposit_date,
      amount: payload.amount,
      notes: payload.notes
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Player deposit added successfully',
      data: deposit
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getPlayerDepositsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const query = playerDepositQuerySchema.parse(req.query);
    const deposits = await getPlayerDepositsByUserId(userId, {
      playerId: query.player_id,
      fromDate: query.from_date,
      toDate: query.to_date
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: deposits
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const updatePlayerDepositController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = playerDepositParamsSchema.parse(req.params);
    const payload = createPlayerDepositBodySchema.parse(req.body);
    const deposit = await updatePlayerDepositForUser(userId, params.depositId, {
      playerId: payload.player_id,
      depositDate: payload.deposit_date,
      amount: payload.amount,
      notes: payload.notes
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Player deposit updated successfully',
      data: deposit
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
