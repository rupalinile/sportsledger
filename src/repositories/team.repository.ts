import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type TeamRow = RowDataPacket & {
  id: number;
  user_id: number;
  team_name: string;
};

export const createTeamRecord = async (
  connection: PoolConnection,
  params: {
    userId: number;
    teamName: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO teams (user_id, team_name)
      VALUES (?, ?)`,
    [params.userId, params.teamName]
  );

  return result.insertId;
};

export const findTeamsByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<TeamRow[]> => {
  const [rows] = await connection.query<TeamRow[]>(
    `SELECT id, user_id, team_name
      FROM teams
      WHERE user_id = ?
      ORDER BY id DESC`,
    [userId]
  );

  return rows;
};

export const findTeamByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    teamId: number;
    userId: number;
  }
): Promise<TeamRow | null> => {
  const [rows] = await connection.query<TeamRow[]>(
    `SELECT id, user_id, team_name
      FROM teams
      WHERE id = ?
        AND user_id = ?
      LIMIT 1`,
    [params.teamId, params.userId]
  );

  return rows[0] ?? null;
};

export const updateTeamByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    teamId: number;
    userId: number;
    teamName: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE teams
      SET team_name = ?
      WHERE id = ?
        AND user_id = ?`,
    [params.teamName, params.teamId, params.userId]
  );

  return result.affectedRows;
};
