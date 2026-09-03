import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  cancelMatchForUser,
  completeMatchForUser,
  createMatch,
  getMatchByIdForUser,
  getMatchPlayersByMatchIdForUser,
  getSettledMatchesByUserId,
  getScheduledMatchesByUserId,
  updateMatchForUser
} from '../services/match.service';
import { AppError } from '../utils/AppError';
import {
  completeMatchBodySchema,
  createMatchBodySchema,
  matchParamsSchema
} from '../validators/match.validator';

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

export const createMatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const payload = createMatchBodySchema.parse(req.body);
    const match = await createMatch(userId, {
      myTeamId: payload.my_team_id,
      opponentTeamName: payload.opponent_team_name,
      matchDate: payload.match_date,
      matchTime: payload.match_time,
      groundName: payload.ground_name,
      opponentCaptainName: payload.opponent_captain_name,
      opponentCaptainNumber: payload.opponent_captain_number,
      slotStatus: payload.slot_status,
      matchFees: payload.match_fees,
      paymentStatus: payload.payment_status
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Match scheduled successfully',
      data: match
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getScheduledMatchesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const matches = await getScheduledMatchesByUserId(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

export const getSettledMatchesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const matches = await getSettledMatchesByUserId(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};


export const getMatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = matchParamsSchema.parse(req.params);
    const match = await getMatchByIdForUser(userId, params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: match
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getMatchPlayersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = matchParamsSchema.parse(req.params);
    const matchPlayers = await getMatchPlayersByMatchIdForUser(userId, params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: matchPlayers
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const updateMatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = matchParamsSchema.parse(req.params);
    const payload = createMatchBodySchema.parse(req.body);

    await updateMatchForUser(userId, params.id, {
      myTeamId: payload.my_team_id,
      opponentTeamName: payload.opponent_team_name,
      matchDate: payload.match_date,
      matchTime: payload.match_time,
      groundName: payload.ground_name,
      opponentCaptainName: payload.opponent_captain_name,
      opponentCaptainNumber: payload.opponent_captain_number,
      slotStatus: payload.slot_status,
      matchFees: payload.match_fees,
      paymentStatus: payload.payment_status
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Match updated successfully'
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const cancelMatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = matchParamsSchema.parse(req.params);

    await cancelMatchForUser(userId, params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Match cancelled successfully'
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const completeMatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = matchParamsSchema.parse(req.params);
    const payload = completeMatchBodySchema.parse(req.body);
    const result = await completeMatchForUser(userId, params.id, {
      ballFees: payload.ball_fees,
      totalPlayerCount: payload.total_player_count,
      playerIds: payload.player_ids
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Match completed successfully',
      data: result
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
