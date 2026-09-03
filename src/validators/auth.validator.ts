import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

export const registerSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string'
    })
    .trim()
    .min(4, 'Username must be at least 4 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Username can contain only letters, numbers, and underscore')
    .transform((username) => username.toLowerCase()),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string'
    })
    .min(8, 'Password must be at least 8 characters'),
  fullName: optionalTrimmedString,
  email: z
    .string()
    .trim()
    .email('Email must be valid')
    .transform((email) => email.toLowerCase())
    .nullable()
    .optional(),
  phoneNumber: optionalTrimmedString
});

export const loginSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string'
    })
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username must be at most 50 characters')
    .transform((username) => username.toLowerCase()),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string'
    })
    .min(1, 'Password is required'),
  deviceId: optionalTrimmedString,
  deviceName: optionalTrimmedString
});

export const forgotPasswordSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string'
    })
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username must be at most 50 characters')
    .transform((username) => username.toLowerCase())
});

export const resendResetOtpSchema = forgotPasswordSchema;

export const verifyResetOtpSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string'
    })
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username must be at most 50 characters')
    .transform((username) => username.toLowerCase()),
  otp: z
    .string({
      required_error: 'OTP is required',
      invalid_type_error: 'OTP must be a string'
    })
    .regex(/^\d{6}$/, 'OTP must be exactly 6 numeric digits')
});

export const resetPasswordSchema = z
  .object({
    resetToken: z
      .string({
        required_error: 'Reset token is required',
        invalid_type_error: 'Reset token must be a string'
      })
      .trim()
      .min(1, 'Reset token is required'),
    newPassword: z
      .string({
        required_error: 'New password is required',
        invalid_type_error: 'New password must be a string'
      })
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string({
        required_error: 'Confirm password is required',
        invalid_type_error: 'Confirm password must be a string'
      })
      .min(1, 'Confirm password is required')
  })
  .refine((input) => input.confirmPassword === input.newPassword, {
    message: 'Confirm password must match new password',
    path: ['confirmPassword']
  });

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token is required',
      invalid_type_error: 'Refresh token must be a string'
    })
    .trim()
    .min(1, 'Refresh token is required')
});

export const logoutSchema = refreshTokenSchema;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'Current password is required',
      invalid_type_error: 'Current password must be a string'
    })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({
      required_error: 'New password is required',
      invalid_type_error: 'New password must be a string'
    })
    .min(8, 'New password must be at least 8 characters')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResendResetOtpInput = z.infer<typeof resendResetOtpSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
