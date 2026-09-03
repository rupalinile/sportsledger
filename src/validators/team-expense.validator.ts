import { z } from 'zod';

export const teamTransactionCategories = ['DEPOSITED', 'EXPENSE'] as const;

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
    required_error: 'Transaction ID is required',
    invalid_type_error: 'Transaction ID must be a valid positive integer'
  })
  .regex(/^[1-9]\d*$/, 'Transaction ID must be a valid positive integer')
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value), {
    message: 'Transaction ID must be a valid positive integer'
  });

const teamExpenseTeamIdParam = z
  .string({
    required_error: 'Team ID is required',
    invalid_type_error: 'Team ID must be a valid team filter'
  })
  .trim()
  .transform((value) => {
    const normalizedValue = value.toLowerCase();

    if (
      normalizedValue === 'all' ||
      normalizedValue === 'all-teams' ||
      normalizedValue === 'all_teams'
    ) {
      return 0;
    }

    if (/^(0|[1-9]\d*)$/.test(value)) {
      return Number(value);
    }

    return Number.NaN;
  })
  .refine((value) => Number.isSafeInteger(value) && value >= 0, {
    message: 'Team ID must be a valid team filter'
  });

export const teamTransactionParamsSchema = z.object({
  transactionId: positiveIntegerParam
});

export const teamExpenseTeamParamsSchema = z
  .object({
    teamId: teamExpenseTeamIdParam.optional()
  })
  .transform((params) => ({
    teamId: params.teamId ?? 0
  }));

export const createTeamTransactionBodySchema = z.object({
  teamId: positiveIntegerSchema,
  category: z.enum(teamTransactionCategories, {
    required_error: 'Category is required',
    invalid_type_error: 'Category must be either DEPOSITED or EXPENSE'
  }),
  transactionDate: z
    .string({
      required_error: 'Transaction date is required',
      invalid_type_error: 'Transaction date must be a string'
    })
    .trim()
    .refine(isValidDateOnly, {
      message: 'Transaction date must be a valid date in YYYY-MM-DD format'
    }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be greater than 0'),
  description: z
    .string({
      required_error: 'Description is required',
      invalid_type_error: 'Description must be a string'
    })
    .trim()
    .min(1, 'Description is required')
    .max(250, 'Description must be at most 250 characters')
});

export const teamTransactionQuerySchema = z.object({
  category: z
    .enum(teamTransactionCategories, {
      invalid_type_error: 'Category must be either DEPOSITED or EXPENSE'
    })
    .optional()
});

export type CreateTeamTransactionBodyInput = z.infer<
  typeof createTeamTransactionBodySchema
>;
export type TeamTransactionParamsInput = z.infer<typeof teamTransactionParamsSchema>;
export type TeamTransactionQueryInput = z.infer<typeof teamTransactionQuerySchema>;
