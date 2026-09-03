import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import { sendSuccess } from '../utils/api-response';

export const getHealth = (_req: Request, res: Response): Response => {
  return sendSuccess(res, HTTP_STATUS.OK, 'CrickTrack API is running');
};
