import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { APP_VERSION_CHECK_SUCCESS_MESSAGE } from '../constants/app-version';
import { HTTP_STATUS } from '../constants/http-status';
import { checkAppVersion } from '../services/app-version.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/api-response';
import { appVersionCheckQuerySchema } from '../validators/app-version.validator';

const handleValidationError = (error: unknown, next: NextFunction): boolean => {
  if (error instanceof ZodError) {
    next(
      new AppError(
        error.errors[0]?.message ?? 'Invalid request',
        HTTP_STATUS.BAD_REQUEST
      )
    );
    return true;
  }

  return false;
};

export const checkAppVersionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = appVersionCheckQuerySchema.parse(req.query);
    const versionCheck = await checkAppVersion(query);

    sendSuccess(
      res,
      HTTP_STATUS.OK,
      APP_VERSION_CHECK_SUCCESS_MESSAGE,
      versionCheck
    );
  } catch (error) {
    if (handleValidationError(error, next)) {
      return;
    }

    next(error);
  }
};
