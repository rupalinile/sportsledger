import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type PlayerExpensePlayerRow = RowDataPacket & {
  id: number;
  player_name: string;
};

export type PlayerExpenseMatchRow = RowDataPacket & {
  match_id: number;
  match_date: string;
  opponent_team_name: string;
};

export type PlayerDepositTotalRow = RowDataPacket & {
  player_id: number;
  total_deposit: number | string;
};

export type PlayerMatchExpenseRow = RowDataPacket & {
  player_id: number;
  match_id: number;
  amount: number | string;
};

export type PlayerExpenseDepositRow = RowDataPacket & {
  deposit_id: number;
  deposit_date: string;
  amount: number | string;
  notes: string | null;
};

export type PlayerExpenseMatchDetailRow = RowDataPacket & {
  match_id: number;
  match_date: string;
  opponent_team_name: string;
  per_head_expense: number | string;
};

export const findActivePlayersForExpenseSummary = async (
  connection: PoolConnection,
  userId: number
): Promise<PlayerExpensePlayerRow[]> => {
  const [rows] = await connection.query<PlayerExpensePlayerRow[]>(
    `SELECT id, player_name
      FROM players
      WHERE user_id = ?
        AND is_active = 1
      ORDER BY id DESC`,
    [userId]
  );

  return rows;
};

export const findCompletedMatchesForExpenseSummary = async (
  connection: PoolConnection,
  params: {
    userId: number;
    matchStatus: string;
  }
): Promise<PlayerExpenseMatchRow[]> => {
  const [rows] = await connection.query<PlayerExpenseMatchRow[]>(
    `SELECT
        id AS match_id,
        DATE_FORMAT(match_date, '%Y-%m-%d') AS match_date,
        opponent_team_name
      FROM matches
      WHERE user_id = ?
        AND match_status = ?
      ORDER BY match_date DESC, id DESC`,
    [params.userId, params.matchStatus]
  );

  return rows;
};

export const findPlayerDepositTotalsForExpenseSummary = async (
  connection: PoolConnection,
  userId: number
): Promise<PlayerDepositTotalRow[]> => {
  const [rows] = await connection.query<PlayerDepositTotalRow[]>(
    `SELECT
        pd.player_id,
        COALESCE(SUM(pd.amount), 0) AS total_deposit
      FROM player_deposits pd
      INNER JOIN players p
        ON p.id = pd.player_id
        AND p.user_id = pd.user_id
        AND p.is_active = 1
      WHERE pd.user_id = ?
      GROUP BY pd.player_id`,
    [userId]
  );

  return rows;
};

export const findPlayerMatchExpensesForExpenseSummary = async (
  connection: PoolConnection,
  params: {
    userId: number;
    matchStatus: string;
  }
): Promise<PlayerMatchExpenseRow[]> => {
  const [rows] = await connection.query<PlayerMatchExpenseRow[]>(
    `SELECT
        mp.player_id,
        mp.match_id,
        COALESCE(SUM(mp.per_head_expense), 0) AS amount
      FROM match_players mp
      INNER JOIN matches m
        ON m.id = mp.match_id
        AND m.user_id = ?
        AND m.match_status = ?
      INNER JOIN players p
        ON p.id = mp.player_id
        AND p.user_id = m.user_id
        AND p.is_active = 1
      GROUP BY mp.player_id, mp.match_id`,
    [params.userId, params.matchStatus]
  );

  return rows;
};

export const findPlayerDepositsByPlayerIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
  }
): Promise<PlayerExpenseDepositRow[]> => {
  const [rows] = await connection.query<PlayerExpenseDepositRow[]>(
    `SELECT
        id AS deposit_id,
        DATE_FORMAT(deposit_date, '%Y-%m-%d') AS deposit_date,
        amount,
        notes
      FROM player_deposits
      WHERE player_id = ?
        AND user_id = ?
      ORDER BY deposit_date DESC, id DESC`,
    [params.playerId, params.userId]
  );

  return rows;
};

export const findCompletedMatchExpensesByPlayerIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
    matchStatus: string;
  }
): Promise<PlayerExpenseMatchDetailRow[]> => {
  const [rows] = await connection.query<PlayerExpenseMatchDetailRow[]>(
    `SELECT
        m.id AS match_id,
        DATE_FORMAT(m.match_date, '%Y-%m-%d') AS match_date,
        m.opponent_team_name,
        COALESCE(SUM(mp.per_head_expense), 0) AS per_head_expense
      FROM match_players mp
      INNER JOIN matches m
        ON m.id = mp.match_id
        AND m.user_id = ?
        AND m.match_status = ?
      WHERE mp.player_id = ?
      GROUP BY m.id, m.match_date, m.opponent_team_name
      ORDER BY m.match_date DESC, m.id DESC`,
    [params.userId, params.matchStatus, params.playerId]
  );

  return rows;
};
