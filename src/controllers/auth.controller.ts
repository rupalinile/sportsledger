import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/http-status';
import {
  changeUserPassword,
  FORGOT_PASSWORD_GENERIC_MESSAGE,
  getCurrentUser,
  loginUser,
  logoutUserFromAllDevices,
  logoutUser,
  refreshAuthTokens,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  RESEND_RESET_OTP_GENERIC_MESSAGE,
  resetUserPassword,
  registerUser,
  verifyPasswordResetOtp
} from '../services/auth.service';
import { AppError } from '../utils/AppError';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendResetOtpSchema,
  resetPasswordSchema,
  verifyResetOtpSchema
} from '../validators/auth.validator';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await registerUser(payload);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Registration successful',
      user: result.user,
      subscription: result.subscription
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await loginUser(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      user: result.user,
      subscription: result.subscription,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    await requestPasswordResetOtp(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: FORGOT_PASSWORD_GENERIC_MESSAGE
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const verifyResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = verifyResetOtpSchema.parse(req.body);
    const result = await verifyPasswordResetOtp(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: result.resetToken
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const resendResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = resendResetOtpSchema.parse(req.body);
    await resendPasswordResetOtp(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESEND_RESET_OTP_GENERIC_MESSAGE
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    await resetUserPassword(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset successfully. Please login again.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = refreshTokenSchema.parse(req.body);
    const result = await refreshAuthTokens(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = logoutSchema.parse(req.body);
    await logoutUser(payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    await logoutUserFromAllDevices(req.user.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    const payload = changePasswordSchema.parse(req.body);
    await changeUserPassword(req.user.userId, payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new AppError(error.errors[0]?.message ?? 'Invalid request body', HTTP_STATUS.BAD_REQUEST));
      return;
    }

    next(error);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    const result = await getCurrentUser(req.user.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      user: result.user,
      subscription: result.subscription
    });
  } catch (error) {
    next(error);
  }
};

export const testAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Authenticated successfully',
    user: req.user
  });
};
