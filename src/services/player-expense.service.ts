import { databasePool } from '../config/database';
import {
  findActivePlayersForExpenseSummary,
  findCompletedMatchExpensesByPlayerIdAndUserId,
  findCompletedMatchesForExpenseSummary,
  findPlayerDepositsByPlayerIdAndUserId,
  findPlayerDepositTotalsForExpenseSummary,
  findPlayerMatchExpensesForExpenseSummary
} from '../repositories/player-expense.repository';
import { findActivePlayerByIdAndUserId } from '../repositories/player.repository';
import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../utils/AppError';

const COMPLETED_MATCH_STATUS = 'COMPLETED';

export type PlayerExpenseSummaryMatch = {
  match_id: number;
  match_date: string;
  opponent_team_name: string;
};

export type PlayerMatchExpenseResult = {
  match_id: number;
  amount: number | null;
};

export type PlayerExpenseSummaryPlayer = {
  player_id: number;
  player_name: string;
  total_deposit: number;
  total_match_expense: number;
  remaining_balance: number;
  match_expenses: PlayerMatchExpenseResult[];
};

export type PlayerExpenseSummaryResult = {
  summary: {
    total_deposited: number;
    total_match_expense: number;
    remaining_balance: number;
  };
  matches: PlayerExpenseSummaryMatch[];
  players: PlayerExpenseSummaryPlayer[];
};

export type PlayerExpenseDepositResult = {
  deposit_id: number;
  deposit_date: string;
  amount: number;
  notes: string | null;
};

export type PlayerExpenseMatchDetailResult = {
  match_id: number;
  match_date: string;
  opponent_team_name: string;
  per_head_expense: number;
};

export type PlayerExpenseDetailResult = {
  player: {
    player_id: number;
    player_name: string;
  };
  summary: {
    total_deposit: number;
    total_match_expense: number;
    remaining_balance: number;
  };
  deposits: PlayerExpenseDepositResult[];
  match_expenses: PlayerExpenseMatchDetailResult[];
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const toAmount = (value: number | string | undefined): number =>
  roundToTwoDecimals(Number(value ?? 0));

export const getPlayerExpenseSummaryByUserId = async (
  userId: number
): Promise<PlayerExpenseSummaryResult> => {
  const connection = await databasePool.getConnection();

  try {
    const players = await findActivePlayersForExpenseSummary(connection, userId);
    const matches = await findCompletedMatchesForExpenseSummary(connection, {
      userId,
      matchStatus: COMPLETED_MATCH_STATUS
    });
    const depositTotals = await findPlayerDepositTotalsForExpenseSummary(connection, userId);
    const matchExpenses = await findPlayerMatchExpensesForExpenseSummary(connection, {
      userId,
      matchStatus: COMPLETED_MATCH_STATUS
    });

    const depositTotalByPlayerId = new Map(
      depositTotals.map((deposit) => [deposit.player_id, toAmount(deposit.total_deposit)])
    );
    const matchExpenseByPlayerAndMatch = new Map<string, number>();

    for (const expense of matchExpenses) {
      matchExpenseByPlayerAndMatch.set(
        `${expense.player_id}:${expense.match_id}`,
        toAmount(expense.amount)
      );
    }

    let totalDeposited = 0;
    let totalMatchExpense = 0;

    const mappedPlayers = players.map((player) => {
      const totalDeposit = depositTotalByPlayerId.get(player.id) ?? 0;
      const playerMatchExpenses = matches.map((match) => ({
        match_id: match.match_id,
        amount: matchExpenseByPlayerAndMatch.get(`${player.id}:${match.match_id}`) ?? null
      }));
      const playerTotalMatchExpense = roundToTwoDecimals(
        playerMatchExpenses.reduce((total, expense) => total + (expense.amount ?? 0), 0)
      );
      const remainingBalance = roundToTwoDecimals(totalDeposit - playerTotalMatchExpense);

      totalDeposited = roundToTwoDecimals(totalDeposited + totalDeposit);
      totalMatchExpense = roundToTwoDecimals(totalMatchExpense + playerTotalMatchExpense);

      return {
        player_id: player.id,
        player_name: player.player_name,
        total_deposit: totalDeposit,
        total_match_expense: playerTotalMatchExpense,
        remaining_balance: remainingBalance,
        match_expenses: playerMatchExpenses
      };
    });

    return {
      summary: {
        total_deposited: totalDeposited,
        total_match_expense: totalMatchExpense,
        remaining_balance: roundToTwoDecimals(totalDeposited - totalMatchExpense)
      },
      matches,
      players: mappedPlayers
    };
  } finally {
    connection.release();
  }
};

export const getPlayerExpenseDetailsByPlayerId = async (
  userId: number,
  playerId: number
): Promise<PlayerExpenseDetailResult> => {
  const connection = await databasePool.getConnection();

  try {
    const player = await findActivePlayerByIdAndUserId(connection, {
      playerId,
      userId
    });

    if (!player) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }

    const depositRows = await findPlayerDepositsByPlayerIdAndUserId(connection, {
      playerId,
      userId
    });
    const matchExpenseRows = await findCompletedMatchExpensesByPlayerIdAndUserId(connection, {
      playerId,
      userId,
      matchStatus: COMPLETED_MATCH_STATUS
    });

    const deposits = depositRows.map((deposit) => ({
      deposit_id: deposit.deposit_id,
      deposit_date: deposit.deposit_date,
      amount: toAmount(deposit.amount),
      notes: deposit.notes
    }));
    const matchExpenses = matchExpenseRows.map((expense) => ({
      match_id: expense.match_id,
      match_date: expense.match_date,
      opponent_team_name: expense.opponent_team_name,
      per_head_expense: toAmount(expense.per_head_expense)
    }));
    const totalDeposit = roundToTwoDecimals(
      deposits.reduce((total, deposit) => total + deposit.amount, 0)
    );
    const totalMatchExpense = roundToTwoDecimals(
      matchExpenses.reduce((total, expense) => total + expense.per_head_expense, 0)
    );

    return {
      player: {
        player_id: player.id,
        player_name: player.player_name
      },
      summary: {
        total_deposit: totalDeposit,
        total_match_expense: totalMatchExpense,
        remaining_balance: roundToTwoDecimals(totalDeposit - totalMatchExpense)
      },
      deposits,
      match_expenses: matchExpenses
    };
  } finally {
    connection.release();
  }
};
