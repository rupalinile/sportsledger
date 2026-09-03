import { z } from 'zod';

const isValidDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const positiveIntegerParam = z
  .string({
    required_error: 'Deposit ID is required',
    invalid_type_error: 'Deposit ID must be a valid positive integer'
  })
  .regex(/^[1-9]\d*$/, 'Deposit ID must be a valid positive integer')
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Deposit ID must be a valid positive integer'
  });

const positiveIntegerSchema = z
  .number({
    required_error: 'Player ID is required',
    invalid_type_error: 'Player ID must be a valid positive integer'
  })
  .int('Player ID must be a valid positive integer')
  .positive('Player ID must be a valid positive integer')
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Player ID must be a valid positive integer'
  });

const dateQuerySchema = z
  .string({
    invalid_type_error: 'Date must be a string'
  })
  .trim()
  .refine(isValidDateOnly, {
    message: 'Date must be a valid date in YYYY-MM-DD format'
  });

export const playerDepositParamsSchema = z.object({
  depositId: positiveIntegerParam
});

export const playerDepositQuerySchema = z.object({
  player_id: z
    .string()
    .regex(/^[1-9]\d*$/, 'Player ID must be a valid positive integer')
    .transform((value) => Number(value))
    .refine((value) => Number.isSafeInteger(value), {
      message: 'Player ID must be a valid positive integer'
    })
    .optional(),
  from_date: dateQuerySchema.optional(),
  to_date: dateQuerySchema.optional()
});

export const createPlayerDepositBodySchema = z.object({
  player_id: positiveIntegerSchema,
  deposit_date: z
    .string({
      required_error: 'Deposit date is required',
      invalid_type_error: 'Deposit date must be a string'
    })
    .trim()
    .refine(isValidDateOnly, {
      message: 'Deposit date must be a valid date in YYYY-MM-DD format'
    }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be greater than 0'),
  notes: z
    .string({
      invalid_type_error: 'Notes must be a string'
    })
    .trim()
    .max(250, 'Notes must be at most 250 characters')
    .optional()
});

export type CreatePlayerDepositBodyInput = z.infer<typeof createPlayerDepositBodySchema>;
export type PlayerDepositParamsInput = z.infer<typeof playerDepositParamsSchema>;
export type PlayerDepositQueryInput = z.infer<typeof playerDepositQuerySchema>;
