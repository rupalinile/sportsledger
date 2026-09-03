import bcrypt from 'bcrypt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { databasePool } from '../config/database';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/http-status';
import {
  ActiveSubscriptionRow,
  createPasswordResetOtp,
  createRefreshToken,
  createUser,
  createUserSubscription,
  CurrentUserRow,
  expireUnusedPasswordResetOtpsByUserId,
  findActivePasswordResetUserByUsername,
  findAuthUserPasswordByIdForUpdate,
  findAuthUserByUsername,
  findCurrentActiveSubscriptionByUserId,
  findCurrentUserById,
  findLatestUnusedPasswordResetOtpByUserId,
  findLatestResendablePasswordResetOtpByUserIdForUpdate,
  findLatestValidPasswordResetOtpByUserIdForUpdate,
  findRefreshTokenByHashForUpdate,
  findSubscriptionPlanByCode,
  findUserByEmail,
  findUserByUsername,
  findVerifiedPasswordResetOtpByIdForUpdate,
  incrementPasswordResetOtpAttemptCount,
  invalidatePasswordResetOtpById,
  invalidateOtherOutstandingPasswordResetOtps,
  markPasswordResetOtpUsed,
  markPasswordResetOtpVerified,
  revokeRefreshToken,
  revokeRefreshTokensByUserId,
  updateUserPasswordHash,
  updateUserLastLoginAt,
  UserRecord
} from '../repositories/auth.repository';
import { AppError } from '../utils/AppError';
import {
  generateAccessToken,
  generatePasswordResetToken,
  generateRefreshToken,
  hashRefreshToken,
  PasswordResetTokenPayload,
  verifyPasswordResetToken,
  verifyRefreshToken
} from '../utils/jwt';
import { generateNumericOtp, hashOtp, isOtpHashMatch } from '../utils/otp';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResendResetOtpInput,
  ResetPasswordInput,
  VerifyResetOtpInput
} from '../validators/auth.validator';
import { sendPasswordResetOtpEmail } from './email.service';

const PASSWORD_SALT_ROUNDS = 12;
const FREE_PLAN_CODE = 'FREE';
const ACTIVE_STATUS = 'ACTIVE' as const;
const INACTIVE_STATUS = 'INACTIVE' as const;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an eligible account exists, a password reset OTP has been sent.';
export const RESEND_RESET_OTP_GENERIC_MESSAGE =
  'If an eligible account exists, a new password reset OTP has been sent.';
const INVALID_OR_EXPIRED_OTP_MESSAGE = 'Invalid or expired OTP';

export type RegisterResult = {
  user: UserRecord;
  subscription: {
    planCode: string;
    status: 'ACTIVE';
  };
};

export type LoginResult = {
  user: {
    id: number;
    username: string;
    fullName: string | null;
  };
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    startDate: Date | string;
    endDate: Date | string | null;
  };
  accessToken: string;
  refreshToken: string;
};

export type CurrentUserResult = {
  user: {
    id: number;
    username: string;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: Date | string;
  };
  subscription: LoginResult['subscription'];
};

export type RefreshTokenResult = {
  accessToken: string;
  refreshToken: string;
};

export type VerifyResetOtpResult = {
  resetToken: string;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';
const INVALID_PASSWORD_RESET_TOKEN_MESSAGE = 'Invalid or expired password reset token';

const mapSubscription = (subscription: ActiveSubscriptionRow): LoginResult['subscription'] => ({
  planCode: subscription.plan_code,
  planName: subscription.plan_name,
  status: subscription.subscription_status,
  startDate: subscription.start_date,
  endDate: subscription.end_date
});

const mapCurrentUser = (user: CurrentUserRow): CurrentUserResult['user'] => ({
  id: user.id,
  username: user.username,
  fullName: user.full_name,
  email: user.email,
  phoneNumber: user.phone_number,
  status: user.status,
  emailVerified: Boolean(user.email_verified),
  phoneVerified: Boolean(user.phone_verified),
  createdAt: user.created_at
});

const isExpired = (expiresAt: Date | string): boolean =>
  new Date(expiresAt).getTime() <= Date.now();

const isWithinPasswordResetCooldown = (createdAt: Date | string): boolean =>
  Date.now() - new Date(createdAt).getTime() < PASSWORD_RESET_REQUEST_COOLDOWN_MS;

const createAndSendPasswordResetOtp = async (
  params: {
    userId: number;
    email: string;
    fullName: string | null;
    resendCount?: number;
  }
): Promise<void> => {
  const connection = await databasePool.getConnection();
  const expiresInMinutes = env.PASSWORD_RESET_OTP_EXPIRY_MINUTES;
  const otp = generateNumericOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  try {
    await connection.beginTransaction();
    await createPasswordResetOtp(connection, {
      userId: params.userId,
      otpHash,
      expiresAt,
      resendCount: params.resendCount
    });
    await connection.commit();

    try {
      await sendPasswordResetOtpEmail({
        to: params.email,
        fullName: params.fullName,
        otp,
        expiresInMinutes
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email error';

      console.error('Password reset OTP email failed', { message: errorMessage });

      try {
        await expireUnusedPasswordResetOtpsByUserId(connection, params.userId);
      } catch (expireError) {
        const expireErrorMessage =
          expireError instanceof Error ? expireError.message : 'Unknown OTP expiry error';

        console.error('Failed to expire undelivered password reset OTP', {
          message: expireErrorMessage
        });
      }
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const registerUser = async (input: RegisterInput): Promise<RegisterResult> => {
  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const existingUsername = await findUserByUsername(connection, input.username);

    if (existingUsername) {
      throw new AppError('Username already exists', HTTP_STATUS.CONFLICT);
    }

    if (input.email) {
      const existingEmail = await findUserByEmail(connection, input.email);

      if (existingEmail) {
        throw new AppError('Email already exists', HTTP_STATUS.CONFLICT);
      }
    }

    const freePlan = await findSubscriptionPlanByCode(connection, FREE_PLAN_CODE);

    if (!freePlan) {
      throw new AppError('Free subscription plan is not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const userId = await createUser(connection, {
      username: input.username,
      passwordHash,
      fullName: input.fullName ?? null,
      email: input.email ?? null,
      phoneNumber: input.phoneNumber ?? null,
      status: ACTIVE_STATUS
    });

    await createUserSubscription(connection, userId, freePlan.id);
    await connection.commit();

    return {
      user: {
        id: userId,
        username: input.username,
        fullName: input.fullName ?? null,
        email: input.email ?? null,
        phoneNumber: input.phoneNumber ?? null
      },
      subscription: {
        planCode: freePlan.plan_code,
        status: ACTIVE_STATUS
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const requestPasswordResetOtp = async (
  input: ForgotPasswordInput
): Promise<void> => {
  const connection = await databasePool.getConnection();
  let sendParams: {
    userId: number;
    email: string;
    fullName: string | null;
  } | null = null;

  try {
    await connection.beginTransaction();

    const user = await findActivePasswordResetUserByUsername(connection, input.username);

    if (!user?.email) {
      await connection.commit();
      return;
    }

    const latestOtp = await findLatestUnusedPasswordResetOtpByUserId(connection, user.id);

    if (latestOtp && isWithinPasswordResetCooldown(latestOtp.created_at)) {
      await connection.commit();
      return;
    }

    sendParams = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name
    };

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (sendParams) {
    await createAndSendPasswordResetOtp(sendParams);
  }
};

export const resendPasswordResetOtp = async (
  input: ResendResetOtpInput
): Promise<void> => {
  const connection = await databasePool.getConnection();
  const resendCooldownMs = env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000;
  let sendParams: {
    userId: number;
    email: string;
    fullName: string | null;
    resendCount: number;
  } | null = null;

  try {
    await connection.beginTransaction();

    const user = await findActivePasswordResetUserByUsername(connection, input.username);

    if (!user?.email) {
      await connection.commit();
      return;
    }

    const latestOtp = await findLatestResendablePasswordResetOtpByUserIdForUpdate(
      connection,
      user.id
    );

    if (!latestOtp) {
      await connection.commit();
      return;
    }

    const isWithinCooldown =
      Date.now() - new Date(latestOtp.created_at).getTime() < resendCooldownMs;

    if (
      isWithinCooldown ||
      latestOtp.resend_count >= env.PASSWORD_RESET_MAX_RESENDS
    ) {
      await connection.commit();
      return;
    }

    sendParams = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      resendCount: latestOtp.resend_count + 1
    };

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (sendParams) {
    await createAndSendPasswordResetOtp(sendParams);
  }
};

export const verifyPasswordResetOtp = async (
  input: VerifyResetOtpInput
): Promise<VerifyResetOtpResult> => {
  const connection = await databasePool.getConnection();
  let transactionCompleted = false;

  try {
    await connection.beginTransaction();

    const user = await findActivePasswordResetUserByUsername(connection, input.username);

    if (!user) {
      throw new AppError(INVALID_OR_EXPIRED_OTP_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const otpRequest = await findLatestValidPasswordResetOtpByUserIdForUpdate(
      connection,
      user.id
    );

    if (!otpRequest) {
      throw new AppError(INVALID_OR_EXPIRED_OTP_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    if (otpRequest.attempt_count >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
      await invalidatePasswordResetOtpById(connection, otpRequest.id);
      await connection.commit();
      transactionCompleted = true;
      throw new AppError(INVALID_OR_EXPIRED_OTP_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const isOtpValid = isOtpHashMatch(input.otp, otpRequest.otp_hash);

    if (!isOtpValid) {
      const nextAttemptCount = otpRequest.attempt_count + 1;

      await incrementPasswordResetOtpAttemptCount(connection, otpRequest.id);

      if (nextAttemptCount >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
        await invalidatePasswordResetOtpById(connection, otpRequest.id);
      }

      await connection.commit();
      transactionCompleted = true;
      throw new AppError(INVALID_OR_EXPIRED_OTP_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    await markPasswordResetOtpVerified(connection, otpRequest.id);

    const resetToken = generatePasswordResetToken({
      userId: user.id,
      purpose: 'PASSWORD_RESET',
      otpRequestId: otpRequest.id
    });

    await connection.commit();
    transactionCompleted = true;

    return {
      resetToken: resetToken.token
    };
  } catch (error) {
    if (!transactionCompleted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const resetUserPassword = async (
  input: ResetPasswordInput
): Promise<void> => {
  let tokenPayload: PasswordResetTokenPayload;

  try {
    tokenPayload = verifyPasswordResetToken(input.resetToken);
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      throw new AppError(INVALID_PASSWORD_RESET_TOKEN_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    throw error;
  }

  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const otpRequest = await findVerifiedPasswordResetOtpByIdForUpdate(connection, {
      otpRequestId: tokenPayload.otpRequestId,
      userId: tokenPayload.userId
    });

    if (!otpRequest) {
      throw new AppError(INVALID_PASSWORD_RESET_TOKEN_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const user = await findAuthUserPasswordByIdForUpdate(connection, tokenPayload.userId);

    if (!user || user.status !== ACTIVE_STATUS) {
      throw new AppError(INVALID_PASSWORD_RESET_TOKEN_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const isSamePassword = await bcrypt.compare(input.newPassword, user.password_hash);

    if (isSamePassword) {
      throw new AppError(
        'New password must be different from current password',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);

    await updateUserPasswordHash(connection, user.id, passwordHash);
    await markPasswordResetOtpUsed(connection, otpRequest.id);
    await revokeRefreshTokensByUserId(connection, user.id);
    await invalidateOtherOutstandingPasswordResetOtps(connection, {
      userId: user.id,
      otpRequestId: otpRequest.id
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getCurrentUser = async (userId: number): Promise<CurrentUserResult> => {
  const connection = await databasePool.getConnection();

  try {
    const user = await findCurrentUserById(connection, userId);

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('Your account has been blocked', HTTP_STATUS.FORBIDDEN);
    }

    if (user.status !== ACTIVE_STATUS) {
      throw new AppError('Your account is not active', HTTP_STATUS.FORBIDDEN);
    }

    const subscription = await findCurrentActiveSubscriptionByUserId(connection, user.id);

    if (!subscription) {
      throw new AppError('Active subscription not found', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return {
      user: mapCurrentUser(user),
      subscription: mapSubscription(subscription)
    };
  } finally {
    connection.release();
  }
};

export const refreshAuthTokens = async (
  input: RefreshTokenInput
): Promise<RefreshTokenResult> => {
  let tokenPayload;

  try {
    tokenPayload = verifyRefreshToken(input.refreshToken);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError('Refresh token expired', HTTP_STATUS.UNAUTHORIZED);
    }

    if (error instanceof JsonWebTokenError) {
      throw new AppError(INVALID_REFRESH_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    throw error;
  }

  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const suppliedTokenHash = hashRefreshToken(input.refreshToken);
    const storedToken = await findRefreshTokenByHashForUpdate(connection, suppliedTokenHash);

    if (!storedToken) {
      throw new AppError(INVALID_REFRESH_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    if (storedToken.user_id !== tokenPayload.userId) {
      throw new AppError(INVALID_REFRESH_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    if (storedToken.revoked_at) {
      throw new AppError(INVALID_REFRESH_TOKEN_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    if (isExpired(storedToken.expires_at)) {
      throw new AppError('Refresh token expired', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await findCurrentUserById(connection, tokenPayload.userId);

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('Your account has been blocked', HTTP_STATUS.FORBIDDEN);
    }

    if (user.status !== ACTIVE_STATUS) {
      throw new AppError('Your account is not active', HTTP_STATUS.FORBIDDEN);
    }

    const nextTokenPayload = {
      userId: user.id,
      username: user.username
    };
    const accessToken = generateAccessToken(nextTokenPayload);
    const refreshToken = generateRefreshToken(nextTokenPayload);

    await createRefreshToken(connection, {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken.token),
      deviceId: storedToken.device_id,
      deviceName: storedToken.device_name,
      expiresAt: refreshToken.expiresAt
    });
    await revokeRefreshToken(connection, storedToken.id);
    await connection.commit();

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const logoutUser = async (input: LogoutInput): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const suppliedTokenHash = hashRefreshToken(input.refreshToken);
    const storedToken = await findRefreshTokenByHashForUpdate(connection, suppliedTokenHash);

    if (storedToken) {
      await revokeRefreshToken(connection, storedToken.id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const logoutUserFromAllDevices = async (userId: number): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    await revokeRefreshTokensByUserId(connection, userId);
  } finally {
    connection.release();
  }
};

export const changeUserPassword = async (
  userId: number,
  input: ChangePasswordInput
): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const user = await findAuthUserPasswordByIdForUpdate(connection, userId);

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('Your account has been blocked', HTTP_STATUS.FORBIDDEN);
    }

    if (user.status !== ACTIVE_STATUS) {
      throw new AppError('Your account is not active', HTTP_STATUS.FORBIDDEN);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      input.currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
    }

    const isSamePassword = await bcrypt.compare(input.newPassword, user.password_hash);

    if (isSamePassword) {
      throw new AppError('New password must be different from current password', HTTP_STATUS.BAD_REQUEST);
    }

    const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);

    await updateUserPasswordHash(connection, user.id, passwordHash);
    await revokeRefreshTokensByUserId(connection, user.id);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const connection = await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const user = await findAuthUserByUsername(connection, input.username);

    if (!user) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('Your account has been blocked', HTTP_STATUS.FORBIDDEN);
    }

    if (user.status === INACTIVE_STATUS) {
      throw new AppError('Your account is not active', HTTP_STATUS.FORBIDDEN);
    }

    if (user.status !== ACTIVE_STATUS) {
      throw new AppError('Your account is not active', HTTP_STATUS.FORBIDDEN);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, HTTP_STATUS.UNAUTHORIZED);
    }

    const subscription = await findCurrentActiveSubscriptionByUserId(connection, user.id);

    if (!subscription) {
      throw new AppError('Active subscription not found', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const tokenPayload = {
      userId: user.id,
      username: user.username
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await createRefreshToken(connection, {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken.token),
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      expiresAt: refreshToken.expiresAt
    });
    await updateUserLastLoginAt(connection, user.id);
    await connection.commit();

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name
      },
      subscription: mapSubscription(subscription),
      accessToken: accessToken.token,
      refreshToken: refreshToken.token
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
