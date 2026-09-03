import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createTeam,
  getTeamByIdForUser,
  getTeamsByUserId,
  updateTeamForUser
} from '../services/team.service';
import { AppError } from '../utils/AppError';
import { teamBodySchema, teamParamsSchema } from '../validators/team.validator';

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

export const createTeamController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const payload = teamBodySchema.parse(req.body);
    const team = await createTeam(userId, payload.teamName);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const getTeamsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const teams = await getTeamsByUserId(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamParamsSchema.parse(req.params);
    const team = await getTeamByIdForUser(userId, params.teamId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: team
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};

export const updateTeamController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const params = teamParamsSchema.parse(req.params);
    const payload = teamBodySchema.parse(req.body);
    const team = await updateTeamForUser(userId, params.teamId, payload.teamName);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
