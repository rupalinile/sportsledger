import { z } from 'zod';

const positiveIntegerParam = z
  .string({
    required_error: 'Player ID is required',
    invalid_type_error: 'Player ID must be a valid positive integer'
  })
  .regex(/^[1-9]\d*$/, 'Player ID must be a valid positive integer')
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Player ID must be a valid positive integer'
  });

const teamIdSchema = z
  .number({
    invalid_type_error: 'Team ID must be an integer greater than or equal to 0'
  })
  .int('Team ID must be an integer greater than or equal to 0')
  .min(0, 'Team ID must be an integer greater than or equal to 0');

export const playerParamsSchema = z.object({
  playerId: positiveIntegerParam
});

export const playerQuerySchema = z.object({
  team_id: z
    .string()
    .regex(/^\d+$/, 'Team ID must be an integer greater than or equal to 0')
    .transform((value) => Number(value))
    .refine((value) => Number.isSafeInteger(value), {
      message: 'Team ID must be an integer greater than or equal to 0'
    })
    .optional()
});

export const singlePlayerBodySchema = z.object({
  player_name: z
    .string({
      required_error: 'Player name is required',
      invalid_type_error: 'Player name must be a string'
    })
    .trim()
    .min(1, 'Player name is required')
    .max(150, 'Player name must be at most 150 characters'),
  mobile_number: z
    .string({
      invalid_type_error: 'Mobile number must be a string'
    })
    .trim()
    .max(20, 'Mobile number must be at most 20 characters')
    .optional(),
  team_id: teamIdSchema.optional().default(0)
});

export const playerBodySchema = z.union([
  singlePlayerBodySchema,
  z.array(singlePlayerBodySchema).nonempty('At least one player is required')
]);

export const playerUpdateBodySchema = z.object({
  player_name: z
    .string({
      required_error: 'Player name is required',
      invalid_type_error: 'Player name must be a string'
    })
    .trim()
    .min(1, 'Player name is required')
    .max(150, 'Player name must be at most 150 characters'),
  mobile_number: z
    .string({
      invalid_type_error: 'Mobile number must be a string'
    })
    .trim()
    .max(20, 'Mobile number must be at most 20 characters')
    .optional(),
  team_id: teamIdSchema
});

export type SinglePlayerBodyInput = z.infer<typeof singlePlayerBodySchema>;
export type PlayerBodyInput = z.infer<typeof playerBodySchema>;
export type PlayerParamsInput = z.infer<typeof playerParamsSchema>;
export type PlayerQueryInput = z.infer<typeof playerQuerySchema>;
export type PlayerUpdateBodyInput = z.infer<typeof playerUpdateBodySchema>;
