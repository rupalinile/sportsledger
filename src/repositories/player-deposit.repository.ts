import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type PlayerDepositRow = RowDataPacket & {
  id: number;
  user_id: number;
  player_id: number;
  deposit_date: string | Date;
  amount: number | string;
  notes: string | null;
};

export type PlayerDepositHistoryRow = PlayerDepositRow & {
  player_name: string;
};

export const createPlayerDepositRecord = async (
  connection: PoolConnection,
  params: {
    userId: number;
    playerId: number;
    depositDate: string;
    amount: number;
    notes?: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO player_deposits (user_id, player_id, deposit_date, amount, notes)
      VALUES (?, ?, ?, ?, ?)`,
    [
      params.userId,
      params.playerId,
      params.depositDate,
      params.amount,
      params.notes ?? null
    ]
  );

  return result.insertId;
};

export const findPlayerDepositByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    depositId: number;
    userId: number;
  }
): Promise<PlayerDepositRow | null> => {
  const [rows] = await connection.query<PlayerDepositRow[]>(
    `SELECT id, user_id, player_id, deposit_date, amount, notes
      FROM player_deposits
      WHERE id = ?
        AND user_id = ?
      LIMIT 1`,
    [params.depositId, params.userId]
  );

  return rows[0] ?? null;
};

export const updatePlayerDepositByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    depositId: number;
    userId: number;
    playerId: number;
    depositDate: string;
    amount: number;
    notes?: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE player_deposits
      SET player_id = ?,
        deposit_date = ?,
        amount = ?,
        notes = ?
      WHERE id = ?
        AND user_id = ?`,
    [
      params.playerId,
      params.depositDate,
      params.amount,
      params.notes ?? null,
      params.depositId,
      params.userId
    ]
  );

  return result.affectedRows;
};

export const findPlayerDepositsByUserId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    playerId?: number;
    fromDate?: string;
    toDate?: string;
  }
): Promise<PlayerDepositHistoryRow[]> => {
  const whereClauses = ['pd.user_id = ?'];
  const values: unknown[] = [params.userId];

  if (params.playerId) {
    whereClauses.push('pd.player_id = ?');
    values.push(params.playerId);
  }

  if (params.fromDate) {
    whereClauses.push('pd.deposit_date >= ?');
    values.push(params.fromDate);
  }

  if (params.toDate) {
    whereClauses.push('pd.deposit_date <= ?');
    values.push(params.toDate);
  }

  const [rows] = await connection.query<PlayerDepositHistoryRow[]>(
    `SELECT
        pd.id,
        pd.user_id,
        pd.player_id,
        p.player_name,
        pd.deposit_date,
        pd.amount,
        pd.notes
      FROM player_deposits pd
      INNER JOIN players p
        ON p.id = pd.player_id
        AND p.user_id = pd.user_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY pd.deposit_date DESC, pd.id DESC`,
    values
  );

  return rows;
};
