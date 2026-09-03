import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type PlayerRow = RowDataPacket & {
  id: number;
  user_id: number;
  player_name: string;
  mobile_number: string | null;
  is_active: number;
  team_id: number | null;
  team_name: string | null;
};

export const createPlayerRecord = async (
  connection: PoolConnection,
  params: {
    userId: number;
    playerName: string;
    mobileNumber?: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO players (user_id, player_name, mobile_number)
      VALUES (?, ?, ?)`,
    [params.userId, params.playerName, params.mobileNumber ?? null]
  );

  return result.insertId;
};

export const createPlayerTeamRecord = async (
  connection: PoolConnection,
  params: {
    userId: number;
    playerId: number;
    teamId: number;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO player_teams (user_id, player_id, team_id)
      VALUES (?, ?, ?)`,
    [params.userId, params.playerId, params.teamId]
  );

  return result.insertId;
};

export const updatePlayerByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
    playerName: string;
    mobileNumber?: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE players
      SET player_name = ?,
        mobile_number = ?
      WHERE id = ?
        AND user_id = ?
        AND is_active = 1`,
    [params.playerName, params.mobileNumber ?? null, params.playerId, params.userId]
  );

  return result.affectedRows;
};

export const softDeletePlayerByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE players
      SET is_active = 0
      WHERE id = ?
        AND user_id = ?
        AND is_active = 1`,
    [params.playerId, params.userId]
  );

  return result.affectedRows;
};

export const deletePlayerTeamRecordsByPlayerIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `DELETE FROM player_teams
      WHERE player_id = ?
        AND user_id = ?`,
    [params.playerId, params.userId]
  );

  return result.affectedRows;
};

export const findActivePlayersByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<PlayerRow[]> => {
  const [rows] = await connection.query<PlayerRow[]>(
    `SELECT
        p.id,
        p.user_id,
        p.player_name,
        p.mobile_number,
        p.is_active,
        pt.team_id,
        t.team_name
      FROM players p
      LEFT JOIN (
        SELECT player_id, MIN(team_id) AS team_id
        FROM player_teams
        WHERE user_id = ?
        GROUP BY player_id
      ) pt ON pt.player_id = p.id
      LEFT JOIN teams t
        ON t.id = pt.team_id
        AND t.user_id = p.user_id
      WHERE p.user_id = ?
        AND p.is_active = 1
      ORDER BY p.id DESC`,
    [userId, userId]
  );

  return rows;
};

export const findActivePlayersByTeamId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    teamId: number;
  }
): Promise<PlayerRow[]> => {
  const [rows] = await connection.query<PlayerRow[]>(
    `SELECT DISTINCT
        p.id,
        p.user_id,
        p.player_name,
        p.mobile_number,
        p.is_active,
        pt.team_id,
        t.team_name
      FROM players p
      INNER JOIN player_teams pt
        ON pt.player_id = p.id
        AND pt.user_id = p.user_id
      INNER JOIN teams t
        ON t.id = pt.team_id
        AND t.user_id = p.user_id
      WHERE p.user_id = ?
        AND p.is_active = 1
        AND pt.team_id = ?
      ORDER BY p.id DESC`,
    [params.userId, params.teamId]
  );

  return rows;
};

export const findActivePlayersWithoutTeamByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<PlayerRow[]> => {
  const [rows] = await connection.query<PlayerRow[]>(
    `SELECT
        p.id,
        p.user_id,
        p.player_name,
        p.mobile_number,
        p.is_active,
        NULL AS team_id,
        NULL AS team_name
      FROM players p
      WHERE p.user_id = ?
        AND p.is_active = 1
        AND NOT EXISTS (
          SELECT 1
          FROM player_teams pt
          WHERE pt.player_id = p.id
            AND pt.user_id = p.user_id
        )
      ORDER BY p.id DESC`,
    [userId]
  );

  return rows;
};

export const findActivePlayerByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    playerId: number;
    userId: number;
  }
): Promise<PlayerRow | null> => {
  const [rows] = await connection.query<PlayerRow[]>(
    `SELECT
        p.id,
        p.user_id,
        p.player_name,
        p.mobile_number,
        p.is_active,
        pt.team_id,
        t.team_name
      FROM players p
      LEFT JOIN (
        SELECT player_id, MIN(team_id) AS team_id
        FROM player_teams
        WHERE user_id = ?
          AND player_id = ?
        GROUP BY player_id
      ) pt ON pt.player_id = p.id
      LEFT JOIN teams t
        ON t.id = pt.team_id
        AND t.user_id = p.user_id
      WHERE p.id = ?
        AND p.user_id = ?
        AND p.is_active = 1
      LIMIT 1`,
    [params.userId, params.playerId, params.playerId, params.userId]
  );

  return rows[0] ?? null;
};

export const findActivePlayersByIdsAndUserId = async (
  connection: PoolConnection,
  params: {
    playerIds: number[];
    userId: number;
  }
): Promise<PlayerRow[]> => {
  if (params.playerIds.length === 0) {
    return [];
  }

  const placeholders = params.playerIds.map(() => '?').join(', ');
  const [rows] = await connection.query<PlayerRow[]>(
    `SELECT
        p.id,
        p.user_id,
        p.player_name,
        p.mobile_number,
        p.is_active,
        pt.team_id,
        t.team_name
      FROM players p
      LEFT JOIN (
        SELECT player_id, MIN(team_id) AS team_id
        FROM player_teams
        WHERE user_id = ?
        GROUP BY player_id
      ) pt ON pt.player_id = p.id
      LEFT JOIN teams t
        ON t.id = pt.team_id
        AND t.user_id = p.user_id
      WHERE p.user_id = ?
        AND p.is_active = 1
        AND p.id IN (${placeholders})`,
    [params.userId, params.userId, ...params.playerIds]
  );

  return rows;
};
