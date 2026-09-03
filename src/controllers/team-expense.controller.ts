import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createTeamTransaction,
  deleteTeamTransaction,
  getTeamExpenseSummaryByTeamId,
  getTeamTransactionById,
  getTeamTransactionsByTeamId,
  updateTeamTransaction
} from '../services/team-expense.service';
import { AppError } from '../utils/AppError';
import {
  createTeamTransactionBodySchema,
  teamTransactionParamsSchema,
  teamTransactionQuerySchema
} from '../validators/team-expense.validator';
import { teamParamsSchema } from '../validators/team.validator';

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

export const getTeamExpenseSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamParamsSchema.parse(req.params);
    const summary = await getTeamExpenseSummaryByTeamId(userId, params.teamId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const createTeamTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const payload = createTeamTransactionBodySchema.parse(req.body);
    const transaction = await createTeamTransaction(userId, {
      teamId: payload.teamId,
      category: payload.category,
      transactionDate: payload.transactionDate,
      amount: payload.amount,
      description: payload.description
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Team transaction added successfully',
      data: transaction
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getTeamTransactionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamParamsSchema.parse(req.params);
    const query = teamTransactionQuerySchema.parse(req.query);
    const transactions = await getTeamTransactionsByTeamId(userId, params.teamId, {
      category: query.category
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getTeamTransactionDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamTransactionParamsSchema.parse(req.params);
    const transaction = await getTeamTransactionById(userId, params.transactionId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const updateTeamTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamTransactionParamsSchema.parse(req.params);
    const payload = createTeamTransactionBodySchema.parse(req.body);
    const transaction = await updateTeamTransaction(userId, params.transactionId, {
      teamId: payload.teamId,
      category: payload.category,
      transactionDate: payload.transactionDate,
      amount: payload.amount,
      description: payload.description
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Team transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const deleteTeamTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamTransactionParamsSchema.parse(req.params);

    await deleteTeamTransaction(userId, params.transactionId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Team transaction deleted successfully'
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
