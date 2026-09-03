import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type TeamTransactionCategory = 'DEPOSITED' | 'EXPENSE';

export type TeamTransactionRow = RowDataPacket & {
  id: number;
  team_id: number;
  category: TeamTransactionCategory;
  transaction_date: string | Date;
  amount: number | string;
  description: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export type TeamExpenseSummaryRow = RowDataPacket & {
  total_deposited_amount: number | string;
  total_match_expense_amount: number | string;
  other_deposited_amount: number | string;
  other_expense_amount: number | string;
};

export const findTeamExpenseSummaryByTeamId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    teamId: number;
  }
): Promise<TeamExpenseSummaryRow> => {
  const [rows] = await connection.query<TeamExpenseSummaryRow[]>(
    `SELECT
        COALESCE((
          SELECT SUM(pd.amount)
          FROM player_deposits pd
          INNER JOIN players p
            ON p.id = pd.player_id
            AND p.user_id = pd.user_id
            AND p.is_active = 1
          WHERE pd.user_id = ?
            AND (
              EXISTS (
                SELECT 1
                FROM player_teams pt
                WHERE pt.user_id = pd.user_id
                  AND pt.player_id = pd.player_id
                  AND pt.team_id = ?
              )
              OR NOT EXISTS (
                SELECT 1
                FROM player_teams pt
                WHERE pt.user_id = pd.user_id
                  AND pt.player_id = pd.player_id
              )
            )
        ), 0) AS total_deposited_amount,
        COALESCE((
          SELECT SUM(mp.per_head_expense)
          FROM match_players mp
          INNER JOIN matches m
            ON m.id = mp.match_id
            AND m.user_id = ?
            AND m.my_team_id = ?
            AND m.match_status = 'COMPLETED'
          INNER JOIN players p
            ON p.id = mp.player_id
            AND p.user_id = m.user_id
            AND p.is_active = 1
        ), 0) AS total_match_expense_amount,
        COALESCE((
          SELECT SUM(tt.amount)
          FROM team_transactions tt
          WHERE tt.team_id = ?
            AND tt.category = 'DEPOSITED'
        ), 0) AS other_deposited_amount,
        COALESCE((
          SELECT SUM(tt.amount)
          FROM team_transactions tt
          WHERE tt.team_id = ?
            AND tt.category = 'EXPENSE'
        ), 0) AS other_expense_amount`,
    [params.userId, params.teamId, params.userId, params.teamId, params.teamId, params.teamId]
  );

  return rows[0];
};

export const createTeamTransactionRecord = async (
  connection: PoolConnection,
  params: {
    teamId: number;
    category: TeamTransactionCategory;
    transactionDate: string;
    amount: number;
    description: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO team_transactions (
        team_id,
        category,
        transaction_date,
        amount,
        description
      )
      VALUES (?, ?, ?, ?, ?)`,
    [
      params.teamId,
      params.category,
      params.transactionDate,
      params.amount,
      params.description
    ]
  );

  return result.insertId;
};

export const findTeamTransactionById = async (
  connection: PoolConnection,
  transactionId: number
): Promise<TeamTransactionRow | null> => {
  const [rows] = await connection.query<TeamTransactionRow[]>(
    `SELECT
        id,
        team_id,
        category,
        transaction_date,
        amount,
        description,
        created_at,
        updated_at
      FROM team_transactions
      WHERE id = ?
      LIMIT 1`,
    [transactionId]
  );

  return rows[0] ?? null;
};

export const findTeamTransactionByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    transactionId: number;
    userId: number;
  }
): Promise<TeamTransactionRow | null> => {
  const [rows] = await connection.query<TeamTransactionRow[]>(
    `SELECT
        tt.id,
        tt.team_id,
        tt.category,
        tt.transaction_date,
        tt.amount,
        tt.description,
        tt.created_at,
        tt.updated_at
      FROM team_transactions tt
      INNER JOIN teams t
        ON t.id = tt.team_id
        AND t.user_id = ?
      WHERE tt.id = ?
      LIMIT 1`,
    [params.userId, params.transactionId]
  );

  return rows[0] ?? null;
};

export const updateTeamTransactionById = async (
  connection: PoolConnection,
  params: {
    transactionId: number;
    teamId: number;
    category: TeamTransactionCategory;
    transactionDate: string;
    amount: number;
    description: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE team_transactions
      SET team_id = ?,
        category = ?,
        transaction_date = ?,
        amount = ?,
        description = ?
      WHERE id = ?`,
    [
      params.teamId,
      params.category,
      params.transactionDate,
      params.amount,
      params.description,
      params.transactionId
    ]
  );

  return result.affectedRows;
};

export const deleteTeamTransactionById = async (
  connection: PoolConnection,
  transactionId: number
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `DELETE FROM team_transactions
      WHERE id = ?`,
    [transactionId]
  );

  return result.affectedRows;
};

export const findTeamTransactionsByTeamId = async (
  connection: PoolConnection,
  params: {
    teamId: number;
    category?: TeamTransactionCategory;
  }
): Promise<TeamTransactionRow[]> => {
  const whereClauses = ['team_id = ?'];
  const values: unknown[] = [params.teamId];

  if (params.category) {
    whereClauses.push('category = ?');
    values.push(params.category);
  }

  const [rows] = await connection.query<TeamTransactionRow[]>(
    `SELECT
        id,
        team_id,
        category,
        transaction_date,
        amount,
        description,
        created_at,
        updated_at
      FROM team_transactions
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY transaction_date DESC, id DESC`,
    values
  );

  return rows;
};
