import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

const BEARER_PREFIX = 'Bearer ';

export const authenticateJwt = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authorizationHeader = req.header('authorization');

  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  const accessToken = authorizationHeader.slice(BEARER_PREFIX.length).trim();

  if (!accessToken) {
    next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  try {
    req.user = verifyAccessToken(accessToken);
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(new AppError('Access token expired', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    if (error instanceof JsonWebTokenError) {
      next(new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    next(error);
  }
};
