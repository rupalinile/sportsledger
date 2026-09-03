import { z } from 'zod';

const positiveIntegerParam = z
  .string({
    required_error: 'Team ID is required',
    invalid_type_error: 'Team ID must be a valid positive integer'
  })
  .regex(/^[1-9]\d*$/, 'Team ID must be a valid positive integer')
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Team ID must be a valid positive integer'
  });

export const teamParamsSchema = z.object({
  teamId: positiveIntegerParam
});

export const teamBodySchema = z.object({
  teamName: z
    .string({
      required_error: 'Team name is required',
      invalid_type_error: 'Team name must be a string'
    })
    .trim()
    .min(1, 'Team name is required')
    .max(150, 'Team name must be at most 150 characters')
});

export type TeamParamsInput = z.infer<typeof teamParamsSchema>;
export type TeamBodyInput = z.infer<typeof teamBodySchema>;
