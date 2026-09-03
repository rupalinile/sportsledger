import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenPayload = {
  userId: number;
  username: string;
};

export type GeneratedToken = {
  token: string;
  expiresAt: Date;
};

export type PasswordResetTokenPayload = {
  userId: number;
  purpose: 'PASSWORD_RESET';
  otpRequestId: number;
};

const getTokenExpiry = (token: string): Date => {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new Error('Unable to determine token expiry');
  }

  return new Date(decoded.exp * 1000);
};

const signToken = (
  payload: TokenPayload | PasswordResetTokenPayload,
  secret: string,
  expiresIn: SignOptions['expiresIn'],
  options: Omit<SignOptions, 'expiresIn'> = {}
): GeneratedToken => {
  const token = jwt.sign(payload, secret, { expiresIn, ...options });

  return {
    token,
    expiresAt: getTokenExpiry(token)
  };
};

export const generateAccessToken = (payload: TokenPayload): GeneratedToken =>
  signToken(payload, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']);

export const generateRefreshToken = (payload: TokenPayload): GeneratedToken =>
  signToken(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'], {
    jwtid: crypto.randomUUID()
  });

export const generatePasswordResetToken = (
  payload: PasswordResetTokenPayload
): GeneratedToken =>
  signToken(
    payload,
    env.JWT_PASSWORD_RESET_SECRET,
    env.JWT_PASSWORD_RESET_EXPIRES_IN as SignOptions['expiresIn'],
    {
      jwtid: crypto.randomUUID()
    }
  );

export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded === 'string' ||
    typeof decoded.userId !== 'number' ||
    typeof decoded.username !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return {
    userId: decoded.userId,
    username: decoded.username
  };
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (
    typeof decoded === 'string' ||
    typeof decoded.userId !== 'number' ||
    typeof decoded.username !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return {
    userId: decoded.userId,
    username: decoded.username
  };
};

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_PASSWORD_RESET_SECRET);

  if (
    typeof decoded === 'string' ||
    typeof decoded.userId !== 'number' ||
    decoded.purpose !== 'PASSWORD_RESET' ||
    typeof decoded.otpRequestId !== 'number'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return {
    userId: decoded.userId,
    purpose: decoded.purpose,
    otpRequestId: decoded.otpRequestId
  };
};

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
