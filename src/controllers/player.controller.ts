import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createPlayers,
  deletePlayerForUser,
  getPlayerByIdForUser,
  getPlayersByUserId,
  updatePlayerForUser
} from '../services/player.service';
import { AppError } from '../utils/AppError';
import {
  playerBodySchema,
  playerParamsSchema,
  playerQuerySchema,
  playerUpdateBodySchema
} from '../validators/player.validator';

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

export const createPlayerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const payload = playerBodySchema.parse(req.body);
    const payloads = Array.isArray(payload) ? payload : [payload];
    const players = await createPlayers(
      userId,
      payloads.map((player) => ({
        playerName: player.player_name,
        mobileNumber: player.mobile_number,
        teamId: player.team_id
      }))
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: Array.isArray(payload)
        ? 'Players created successfully'
        : 'Player created successfully',
      data: Array.isArray(payload) ? players : players[0]
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getPlayersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const query = playerQuerySchema.parse(req.query);
    const players = await getPlayersByUserId(userId, query.team_id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: players
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getPlayerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = playerParamsSchema.parse(req.params);
    const player = await getPlayerByIdForUser(userId, params.playerId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: player
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const updatePlayerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = playerParamsSchema.parse(req.params);
    const payload = playerUpdateBodySchema.parse(req.body);
    const player = await updatePlayerForUser(userId, params.playerId, {
      playerName: payload.player_name,
      mobileNumber: payload.mobile_number,
      teamId: payload.team_id
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Player updated successfully',
      data: player
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const deletePlayerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = playerParamsSchema.parse(req.params);

    await deletePlayerForUser(userId, params.playerId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
