import { databasePool } from '../config/database';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createTeamTransactionRecord,
  deleteTeamTransactionById,
  findTeamExpenseSummaryByTeamId,
  findTeamExpenseSummaryByUserId,
  findTeamTransactionById,
  findTeamTransactionByIdAndUserId,
  findTeamTransactionsByTeamId,
  findTeamTransactionsByUserId,
  TeamExpenseSummaryRow,
  TeamTransactionCategory,
  TeamTransactionRow,
  updateTeamTransactionById
} from '../repositories/team-expense.repository';
import { findTeamByIdAndUserId } from '../repositories/team.repository';
import { AppError } from '../utils/AppError';

export type TeamExpenseSummaryResult = {
  totalDepositedAmount: number;
  totalMatchExpenseAmount: number;
  otherDepositedAmount: number;
  otherExpenseAmount: number;
  otherAmount: number;
  totalTeamBalance: number;
  total_scheduled_matches_amount: number;
  scheduled_paid_matches_amount: number;
  scheduled_pending_matches_amount: number;
};

export type TeamTransactionResult = {
  id: number;
  team_id: number;
  category: TeamTransactionCategory;
  transaction_date: string;
  amount: number;
  description: string;
};

export type TeamTransactionListResult = {
  id: number;
  teamId: number;
  category: TeamTransactionCategory;
  transactionDate: string;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const toAmount = (value: number | string | undefined): number =>
  roundToTwoDecimals(Number(value ?? 0));

const formatDateOnly = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const formatDateTime = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const mapTeamTransaction = (transaction: TeamTransactionRow): TeamTransactionResult => ({
  id: transaction.id,
  team_id: transaction.team_id,
  category: transaction.category,
  transaction_date: formatDateOnly(transaction.transaction_date),
  amount: toAmount(transaction.amount),
  description: transaction.description
});

const mapTeamTransactionListItem = (
  transaction: TeamTransactionRow
): TeamTransactionListResult => ({
  id: transaction.id,
  teamId: transaction.team_id,
  category: transaction.category,
  transactionDate: formatDateOnly(transaction.transaction_date),
  amount: toAmount(transaction.amount),
  description: transaction.description,
  createdAt: formatDateTime(transaction.created_at),
  updatedAt: formatDateTime(transaction.updated_at)
});

export const calculateTeamExpenseSummary = (
  summary: Pick<
    TeamExpenseSummaryRow,
    | 'total_deposited_amount'
    | 'total_match_expense_amount'
    | 'other_deposited_amount'
    | 'other_expense_amount'
    | 'total_scheduled_matches_amount'
    | 'scheduled_paid_matches_amount'
    | 'scheduled_pending_matches_amount'
  >
): TeamExpenseSummaryResult => {
  const totalDepositedAmount = toAmount(summary.total_deposited_amount);
  const totalMatchExpenseAmount = toAmount(summary.total_match_expense_amount);
  const otherDepositedAmount = toAmount(summary.other_deposited_amount);
  const otherExpenseAmount = toAmount(summary.other_expense_amount);
  const totalScheduledMatchesAmount = toAmount(summary.total_scheduled_matches_amount);
  const scheduledPaidMatchesAmount = toAmount(summary.scheduled_paid_matches_amount);
  const scheduledPendingMatchesAmount = toAmount(summary.scheduled_pending_matches_amount);
  const otherAmount = roundToTwoDecimals(otherDepositedAmount - otherExpenseAmount);
  const totalTeamBalance = roundToTwoDecimals(
    totalDepositedAmount - totalMatchExpenseAmount + otherAmount
  );

  return {
    totalDepositedAmount,
    totalMatchExpenseAmount,
    otherDepositedAmount,
    otherExpenseAmount,
    otherAmount,
    totalTeamBalance,
    total_scheduled_matches_amount: totalScheduledMatchesAmount,
    scheduled_paid_matches_amount: scheduledPaidMatchesAmount,
    scheduled_pending_matches_amount: scheduledPendingMatchesAmount
  };
};

export const getTeamExpenseSummaryByTeamId = async (
  userId: number,
  teamId: number
): Promise<TeamExpenseSummaryResult> => {
  const connection = await databasePool.getConnection();

  try {
    if (teamId === 0) {
      const summary = await findTeamExpenseSummaryByUserId(connection, userId);

      return calculateTeamExpenseSummary(summary);
    }

    const team = await findTeamByIdAndUserId(connection, {
      teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    const summary = await findTeamExpenseSummaryByTeamId(connection, {
      userId,
      teamId
    });

    return calculateTeamExpenseSummary(summary);
  } finally {
    connection.release();
  }
};

export const createTeamTransaction = async (
  userId: number,
  input: {
    teamId: number;
    category: TeamTransactionCategory;
    transactionDate: string;
    amount: number;
    description: string;
  }
): Promise<TeamTransactionResult> => {
  const connection = await databasePool.getConnection();

  try {
    const team = await findTeamByIdAndUserId(connection, {
      teamId: input.teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    const transactionId = await createTeamTransactionRecord(connection, {
      teamId: input.teamId,
      category: input.category,
      transactionDate: input.transactionDate,
      amount: input.amount,
      description: input.description
    });

    const transaction = await findTeamTransactionById(connection, transactionId);

    if (!transaction) {
      throw new AppError('Team transaction not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapTeamTransaction(transaction);
  } finally {
    connection.release();
  }
};

export const getTeamTransactionsByTeamId = async (
  userId: number,
  teamId: number,
  filters: {
    category?: TeamTransactionCategory;
  }
): Promise<TeamTransactionListResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    if (teamId === 0) {
      const transactions = await findTeamTransactionsByUserId(connection, {
        userId,
        category: filters.category
      });

      return transactions.map(mapTeamTransactionListItem);
    }

    const team = await findTeamByIdAndUserId(connection, {
      teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    const transactions = await findTeamTransactionsByTeamId(connection, {
      teamId,
      category: filters.category
    });

    return transactions.map(mapTeamTransactionListItem);
  } finally {
    connection.release();
  }
};

export const getTeamTransactionById = async (
  userId: number,
  transactionId: number
): Promise<TeamTransactionListResult> => {
  const connection = await databasePool.getConnection();

  try {
    const transaction = await findTeamTransactionByIdAndUserId(connection, {
      transactionId,
      userId
    });

    if (!transaction) {
      throw new AppError('Team transaction not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapTeamTransactionListItem(transaction);
  } finally {
    connection.release();
  }
};

export const updateTeamTransaction = async (
  userId: number,
  transactionId: number,
  input: {
    teamId: number;
    category: TeamTransactionCategory;
    transactionDate: string;
    amount: number;
    description: string;
  }
): Promise<TeamTransactionListResult> => {
  const connection = await databasePool.getConnection();

  try {
    const existingTransaction = await findTeamTransactionByIdAndUserId(connection, {
      transactionId,
      userId
    });

    if (!existingTransaction) {
      throw new AppError('Team transaction not found', HTTP_STATUS.NOT_FOUND);
    }

    const team = await findTeamByIdAndUserId(connection, {
      teamId: input.teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    await updateTeamTransactionById(connection, {
      transactionId,
      teamId: input.teamId,
      category: input.category,
      transactionDate: input.transactionDate,
      amount: input.amount,
      description: input.description
    });

    const updatedTransaction = await findTeamTransactionByIdAndUserId(connection, {
      transactionId,
      userId
    });

    if (!updatedTransaction) {
      throw new AppError('Team transaction not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapTeamTransactionListItem(updatedTransaction);
  } finally {
    connection.release();
  }
};

export const deleteTeamTransaction = async (
  userId: number,
  transactionId: number
): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    const transaction = await findTeamTransactionByIdAndUserId(connection, {
      transactionId,
      userId
    });

    if (!transaction) {
      throw new AppError('Team transaction not found', HTTP_STATUS.NOT_FOUND);
    }

    await deleteTeamTransactionById(connection, transactionId);
  } finally {
    connection.release();
  }
};
