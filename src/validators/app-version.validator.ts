import semver from 'semver';
import { z } from 'zod';
import { APP_PLATFORMS } from '../constants/app-version';

export const appVersionCheckQuerySchema = z.object({
  currentVersion: z
    .string({
      required_error: 'Current version is required',
      invalid_type_error: 'Current version must be a string'
    })
    .trim()
    .min(1, 'Current version is required')
    .refine((value) => semver.valid(value) !== null, {
      message: 'Current version must be a valid semantic version'
    }),
  platform: z
    .string({
      required_error: 'Platform is required',
      invalid_type_error: 'Platform must be a string'
    })
    .trim()
    .toLowerCase()
    .refine(
      (value): value is (typeof APP_PLATFORMS)[number] =>
        APP_PLATFORMS.includes(value as (typeof APP_PLATFORMS)[number]),
      {
        message: 'Platform is not supported'
      }
    )
});

export type AppVersionCheckQueryInput = z.infer<
  typeof appVersionCheckQuerySchema
>;
