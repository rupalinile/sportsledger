import { Response } from 'express';

export type ApiResponse<T = null> = {
  success: boolean;
  message: string;
  data?: T;
};

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response<ApiResponse<T>> => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {})
  };

  return res.status(statusCode).json(response);
};
