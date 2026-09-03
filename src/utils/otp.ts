import crypto from 'crypto';
import { env } from '../config/env';

const OTP_MIN_VALUE = 0;
const OTP_MAX_VALUE = 1_000_000;
const OTP_LENGTH = 6;

export const generateNumericOtp = (): string =>
  crypto.randomInt(OTP_MIN_VALUE, OTP_MAX_VALUE).toString().padStart(OTP_LENGTH, '0');

export const hashOtp = (otp: string): string =>
  crypto.createHmac('sha256', env.OTP_HMAC_SECRET).update(otp).digest('hex');

export const isOtpHashMatch = (otp: string, expectedHash: string): boolean => {
  const suppliedHash = hashOtp(otp);
  const suppliedBuffer = Buffer.from(suppliedHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (suppliedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
};
