import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanStringSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),

    API_PREFIX: z
      .string()
      .min(1)
      .default('/api/v1'),

    DB_HOST: z.string().min(1),

    DB_PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(3306),

    DB_USER: z.string().min(1),

    DB_PASSWORD: z.string().default(''),

    DB_NAME: z.string().min(1),

    DB_CONNECTION_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(10),

    CORS_ORIGIN: z
      .string()
      .min(1)
      .default('*'),

    CORS_ALLOW_NO_ORIGIN: booleanStringSchema.default('true'),

    CORS_CREDENTIALS: booleanStringSchema.default('false'),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(900000),

    RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(100),

    JWT_ACCESS_SECRET: z.string().min(16),

    JWT_REFRESH_SECRET: z.string().min(16),

    JWT_PASSWORD_RESET_SECRET: z.string().min(16),

    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .min(1)
      .default('15m'),

    JWT_REFRESH_EXPIRES_IN: z
      .string()
      .min(1)
      .default('30d'),

    JWT_PASSWORD_RESET_EXPIRES_IN: z
      .string()
      .min(1)
      .default('10m'),

    SMTP_HOST: z.string().min(1),

    SMTP_PORT: z.coerce
      .number()
      .int()
      .positive(),

    SMTP_SECURE: booleanStringSchema,

    SMTP_USER: z.string().min(1),

    SMTP_PASSWORD: z.string().min(1),

    SMTP_FROM_NAME: z.string().min(1),

    SMTP_FROM_EMAIL: z.string().email(),

    PASSWORD_RESET_OTP_EXPIRY_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10),

    PASSWORD_RESET_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .positive()
      .default(5),

    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),

    PASSWORD_RESET_MAX_RESENDS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(3),

    OTP_HMAC_SECRET: z.string().min(32)
  })
  .superRefine((env, ctx) => {
    const allowedOrigins = env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (
      env.NODE_ENV === 'production' &&
      allowedOrigins.includes('*')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGIN must list explicit origins in production',
        path: ['CORS_ORIGIN']
      });
    }

    if (
      env.CORS_CREDENTIALS &&
      allowedOrigins.includes('*')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_CREDENTIALS cannot be true when CORS_ORIGIN contains *',
        path: ['CORS_CREDENTIALS']
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    'Invalid environment configuration',
    parsedEnv.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = parsedEnv.data;