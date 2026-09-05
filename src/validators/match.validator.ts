import { z } from 'zod';

export const matchSlotStatuses = ['GROUND_BOOKED', 'SLOT_BOOKED'] as const;
export const matchPaymentStatuses = ['PENDING', 'PAID', 'RECEIVED'] as const;

const positiveIntegerSchema = z
  .number({
    required_error: 'Team ID is required',
    invalid_type_error: 'Team ID must be a valid positive integer'
  })
  .int('Team ID must be a valid positive integer')
  .positive('Team ID must be a valid positive integer')
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Team ID must be a valid positive integer'
  });

const positiveIntegerParam = z
  .string({
    required_error: 'Match ID is required',
    invalid_type_error: 'Match ID must be a valid positive integer'
  })
  .regex(/^[1-9]\d*$/, 'Match ID must be a valid positive integer')
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Match ID must be a valid positive integer'
  });

export const matchParamsSchema = z.object({
  id: positiveIntegerParam
});

export const createMatchBodySchema = z.object({
  my_team_id: positiveIntegerSchema,
  opponent_team_name: z
    .string({
      required_error: 'Opponent team name is required',
      invalid_type_error: 'Opponent team name must be a string'
    })
    .trim()
    .min(1, 'Opponent team name is required')
    .max(150, 'Opponent team name must be at most 150 characters'),
  match_date: z
    .string({
      required_error: 'Match date is required',
      invalid_type_error: 'Match date must be a string'
    })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Match date must be in YYYY-MM-DD format'),
  match_time: z
    .string({
      required_error: 'Match time is required',
      invalid_type_error: 'Match time must be a string'
    })
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Match time must be in HH:mm:ss format'),
  ground_name: z
    .string({
      required_error: 'Ground name is required',
      invalid_type_error: 'Ground name must be a string'
    })
    .trim()
    .min(1, 'Ground name is required')
    .max(150, 'Ground name must be at most 150 characters'),
  opponent_captain_name: z
    .string({
      invalid_type_error: 'Opponent captain name must be a string'
    })
    .trim()
    .max(150, 'Opponent captain name must be at most 150 characters')
    .optional(),
  opponent_captain_number: z
    .string({
      invalid_type_error: 'Opponent captain number must be a string'
    })
    .trim()
    .max(20, 'Opponent captain number must be at most 20 characters')
    .optional(),
  slot_status: z.enum(matchSlotStatuses, {
    required_error: 'Slot status is required',
    invalid_type_error: 'Invalid slot status'
  }),
  match_fees: z
    .number({
      invalid_type_error: 'Match fees must be a number'
    })
    .nonnegative('Match fees must be greater than or equal to 0')
    .optional(),
  payment_status: z.enum(matchPaymentStatuses, {
    required_error: 'Payment status is required',
    invalid_type_error: 'Invalid payment status'
  })
});

export const completeMatchBodySchema = z
  .object({
    ball_fees: z
      .number({
        required_error: 'Ball fees is required',
        invalid_type_error: 'Ball fees must be a number'
      })
      .nonnegative('Ball fees must be greater than or equal to 0'),
    total_player_count: z
      .number({
        required_error: 'Total player count is required',
        invalid_type_error: 'Total player count must be a valid positive integer'
      })
      .int('Total player count must be a valid positive integer')
      .positive('Total player count must be a valid positive integer')
      .refine((value) => Number.isSafeInteger(value), {
        message: 'Total player count must be a valid positive integer'
      }),
    player_ids: z
      .array(positiveIntegerSchema, {
        required_error: 'Player IDs are required',
        invalid_type_error: 'Player IDs must be an array'
      })
      .min(1, 'Select at least 1 player')
  })
  .superRefine((value, ctx) => {
    if (value.total_player_count !== value.player_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total player count must match selected players count',
        path: ['total_player_count']
      });
    }

  });

export type CreateMatchBodyInput = z.infer<typeof createMatchBodySchema>;
export type CompleteMatchBodyInput = z.infer<typeof completeMatchBodySchema>;
export type MatchParamsInput = z.infer<typeof matchParamsSchema>;
