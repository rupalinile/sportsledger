import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type MatchRow = RowDataPacket & {
  id: number;
  my_team_id: number;
  my_team_name: string;
  opponent_team_name: string;
  match_date: string;
  match_time: string;
  ground_name: string;
  opponent_captain_name: string | null;
  opponent_captain_number: string | null;
  slot_status: string;
  match_fees: number | string | null;
  ball_fees: number | string | null;
  total_expense: number | string | null;
  total_player_count: number | null;
  per_head_expense: number | string | null;
  payment_status: string;
  match_status: string;
};

export type SettledMatchRow = MatchRow & {
  completed_at: string | null;
  cancelled_at: string | null;
};

export type MatchPlayerRow = RowDataPacket & {
  match_id: number;
  player_id: number;
  player_name: string;
  playing_position: number;
  per_head_expense: number | string;
};

export type CreateMatchRecordParams = {
  userId: number;
  myTeamId: number;
  opponentTeamName: string;
  matchDate: string;
  matchTime: string;
  groundName: string;
  opponentCaptainName?: string;
  opponentCaptainNumber?: string;
  slotStatus: string;
  matchFees?: number;
  paymentStatus: string;
  matchStatus: string;
};

export type UpdateMatchRecordParams = {
  userId: number;
  matchId: number;
  myTeamId: number;
  opponentTeamName: string;
  matchDate: string;
  matchTime: string;
  groundName: string;
  opponentCaptainName?: string;
  opponentCaptainNumber?: string;
  slotStatus: string;
  matchFees?: number;
  paymentStatus: string;
};

export type CreateMatchPlayerRecordParams = {
  matchId: number;
  playerId: number;
  playingPosition: number;
  perHeadExpense: number;
};

export const createMatchRecord = async (
  connection: PoolConnection,
  params: CreateMatchRecordParams
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO matches (
        user_id,
        my_team_id,
        opponent_team_name,
        match_date,
        match_time,
        ground_name,
        opponent_captain_name,
        opponent_captain_number,
        slot_status,
        match_fees,
        payment_status,
        match_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.userId,
      params.myTeamId,
      params.opponentTeamName,
      params.matchDate,
      params.matchTime,
      params.groundName,
      params.opponentCaptainName ?? null,
      params.opponentCaptainNumber ?? null,
      params.slotStatus,
      params.matchFees ?? null,
      params.paymentStatus,
      params.matchStatus
    ]
  );

  return result.insertId;
};

export const findScheduledMatchesByUserId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    matchStatus: string;
  }
): Promise<MatchRow[]> => {
  const [rows] = await connection.query<MatchRow[]>(
    `SELECT
        m.id,
        m.my_team_id,
        t.team_name AS my_team_name,
        m.opponent_team_name,
        DATE_FORMAT(m.match_date, '%Y-%m-%d') AS match_date,
        TIME_FORMAT(m.match_time, '%H:%i:%s') AS match_time,
        m.ground_name,
        m.opponent_captain_name,
        m.opponent_captain_number,
        m.slot_status,
        m.match_fees,
        m.ball_fees,
        m.total_expense,
        m.total_player_count,
        m.per_head_expense,
        m.payment_status,
        m.match_status
      FROM matches m
      INNER JOIN teams t
        ON t.id = m.my_team_id
        AND t.user_id = m.user_id
      WHERE m.user_id = ?
        AND m.match_status = ?
      ORDER BY m.match_date ASC, m.match_time ASC`,
    [params.userId, params.matchStatus]
  );

  return rows;
};

export const findSettledMatchesByUserId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    matchStatuses: string[];
  }
): Promise<SettledMatchRow[]> => {
  const placeholders = params.matchStatuses.map(() => '?').join(', ');
  const [rows] = await connection.query<SettledMatchRow[]>(
    `SELECT
        m.id,
        m.my_team_id,
        t.team_name AS my_team_name,
        m.opponent_team_name,
        DATE_FORMAT(m.match_date, '%Y-%m-%d') AS match_date,
        TIME_FORMAT(m.match_time, '%H:%i:%s') AS match_time,
        m.ground_name,
        m.opponent_captain_name,
        m.opponent_captain_number,
        m.slot_status,
        m.match_fees,
        m.ball_fees,
        m.total_expense,
        m.total_player_count,
        m.per_head_expense,
        m.payment_status,
        m.match_status,
        DATE_FORMAT(m.completed_at, '%Y-%m-%d %H:%i:%s') AS completed_at,
        DATE_FORMAT(m.cancelled_at, '%Y-%m-%d %H:%i:%s') AS cancelled_at
      FROM matches m
      INNER JOIN teams t
        ON t.id = m.my_team_id
        AND t.user_id = m.user_id
      WHERE m.user_id = ?
        AND m.match_status IN (${placeholders})
      ORDER BY m.match_date DESC`,
    [params.userId, ...params.matchStatuses]
  );

  return rows;
};


export const findMatchByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    matchId: number;
    userId: number;
  }
): Promise<MatchRow | null> => {
  const [rows] = await connection.query<MatchRow[]>(
    `SELECT
        m.id,
        m.my_team_id,
        t.team_name AS my_team_name,
        m.opponent_team_name,
        DATE_FORMAT(m.match_date, '%Y-%m-%d') AS match_date,
        TIME_FORMAT(m.match_time, '%H:%i:%s') AS match_time,
        m.ground_name,
        m.opponent_captain_name,
        m.opponent_captain_number,
        m.slot_status,
        m.match_fees,
        m.ball_fees,
        m.total_expense,
        m.total_player_count,
        m.per_head_expense,
        m.payment_status,
        m.match_status
      FROM matches m
      INNER JOIN teams t
        ON t.id = m.my_team_id
        AND t.user_id = m.user_id
      WHERE m.id = ?
        AND m.user_id = ?
      LIMIT 1`,
    [params.matchId, params.userId]
  );

  return rows[0] ?? null;
};

export const findMatchPlayersByMatchIdAndUserId = async (
  connection: PoolConnection,
  params: {
    matchId: number;
    userId: number;
  }
): Promise<MatchPlayerRow[]> => {
  const [rows] = await connection.query<MatchPlayerRow[]>(
    `SELECT
        mp.match_id,
        mp.player_id,
        p.player_name,
        mp.playing_position,
        mp.per_head_expense
      FROM match_players mp
      INNER JOIN matches m
        ON m.id = mp.match_id
      INNER JOIN players p
        ON p.id = mp.player_id
        AND p.user_id = m.user_id
      WHERE mp.match_id = ?
        AND m.user_id = ?
      ORDER BY mp.playing_position ASC`,
    [params.matchId, params.userId]
  );

  return rows;
};

export const updateMatchByIdAndUserId = async (
  connection: PoolConnection,
  params: UpdateMatchRecordParams
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE matches
      SET my_team_id = ?,
        opponent_team_name = ?,
        match_date = ?,
        match_time = ?,
        ground_name = ?,
        opponent_captain_name = ?,
        opponent_captain_number = ?,
        slot_status = ?,
        match_fees = ?,
        payment_status = ?
      WHERE id = ?
        AND user_id = ?`,
    [
      params.myTeamId,
      params.opponentTeamName,
      params.matchDate,
      params.matchTime,
      params.groundName,
      params.opponentCaptainName ?? null,
      params.opponentCaptainNumber ?? null,
      params.slotStatus,
      params.matchFees ?? null,
      params.paymentStatus,
      params.matchId,
      params.userId
    ]
  );

  return result.affectedRows;
};

export const cancelMatchByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    matchId: number;
    userId: number;
    matchStatus: string;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE matches
      SET match_status = ?,
        cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?`,
    [params.matchStatus, params.matchId, params.userId]
  );

  return result.affectedRows;
};

export const createMatchPlayerRecords = async (
  connection: PoolConnection,
  players: CreateMatchPlayerRecordParams[]
): Promise<number> => {
  if (players.length === 0) {
    return 0;
  }

  const placeholders = players.map(() => '(?, ?, ?, ?)').join(', ');
  const values = players.flatMap((player) => [
    player.matchId,
    player.playerId,
    player.playingPosition,
    player.perHeadExpense
  ]);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO match_players (
        match_id,
        player_id,
        playing_position,
        per_head_expense
      )
      VALUES ${placeholders}`,
    values
  );

  return result.affectedRows;
};

export const completeMatchByIdAndUserId = async (
  connection: PoolConnection,
  params: {
    matchId: number;
    userId: number;
    matchStatus: string;
    ballFees: number;
    totalExpense: number;
    totalPlayerCount: number;
    perHeadExpense: number;
  }
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE matches
      SET match_status = ?,
        ball_fees = ?,
        total_expense = ?,
        total_player_count = ?,
        per_head_expense = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?`,
    [
      params.matchStatus,
      params.ballFees,
      params.totalExpense,
      params.totalPlayerCount,
      params.perHeadExpense,
      params.matchId,
      params.userId
    ]
  );

  return result.affectedRows;
};
