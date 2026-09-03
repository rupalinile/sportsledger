import { databasePool } from '../config/database';
import { HTTP_STATUS } from '../constants/http-status';
import {
  cancelMatchByIdAndUserId,
  completeMatchByIdAndUserId,
  createMatchRecord,
  createMatchPlayerRecords,
  findMatchByIdAndUserId,
  findMatchPlayersByMatchIdAndUserId,
  findSettledMatchesByUserId,
  findScheduledMatchesByUserId,
  MatchPlayerRow,
  MatchRow,
  SettledMatchRow,
  updateMatchByIdAndUserId
} from '../repositories/match.repository';
import { findActivePlayersByIdsAndUserId } from '../repositories/player.repository';
import { findTeamByIdAndUserId } from '../repositories/team.repository';
import { AppError } from '../utils/AppError';

export const SCHEDULED_MATCH_STATUS = 'SCHEDULED';
const CANCELLED_MATCH_STATUS = 'CANCELLED';
export const COMPLETED_MATCH_STATUS = 'COMPLETED';

export type CreateMatchInput = {
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

export type CreateMatchResult = {
  match_id: number;
};

export type UpdateMatchInput = CreateMatchInput;

export type CompleteMatchInput = {
  ballFees: number;
  totalPlayerCount: number;
  playerIds: number[];
};

export type CompleteMatchResult = {
  match_fees: number;
  ball_fees: number;
  total_expense: number;
  total_player_count: number;
  per_head_expense: number;
};

export type ScheduledMatchResult = {
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
  match_fees: number | null;
  payment_status: string;
  match_status: string;
};

export type SettledMatchResult = ScheduledMatchResult & {
  ball_fees: number | null;
  total_expense: number | null;
  total_player_count: number | null;
  per_head_expense: number | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type MatchPlayerResult = {
  player_id: number;
  player_name: string;
  per_head_expense: number;
};

export type MatchPlayersResult = {
  match_id: number;
  total_player_count: number;
  per_head_expense: number | null;
  players: MatchPlayerResult[];
};

const mapScheduledMatch = (match: MatchRow): ScheduledMatchResult => ({
  id: match.id,
  my_team_id: match.my_team_id,
  my_team_name: match.my_team_name,
  opponent_team_name: match.opponent_team_name,
  match_date: match.match_date,
  match_time: match.match_time,
  ground_name: match.ground_name,
  opponent_captain_name: match.opponent_captain_name,
  opponent_captain_number: match.opponent_captain_number,
  slot_status: match.slot_status,
  match_fees: match.match_fees === null ? null : Number(match.match_fees),
  payment_status: match.payment_status,
  match_status: match.match_status
});

const mapNullableNumber = (value: number | string | null): number | null =>
  value === null ? null : Number(value);

const mapSettledMatch = (match: SettledMatchRow): SettledMatchResult => ({
  ...mapScheduledMatch(match),
  ball_fees: mapNullableNumber(match.ball_fees),
  total_expense: mapNullableNumber(match.total_expense),
  total_player_count: match.total_player_count,
  per_head_expense: mapNullableNumber(match.per_head_expense),
  completed_at: match.completed_at,
  cancelled_at: match.cancelled_at
});

const mapMatchPlayer = (player: MatchPlayerRow): MatchPlayerResult => ({
  player_id: player.player_id,
  player_name: player.player_name,
  per_head_expense: Number(player.per_head_expense)
});

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

export const createMatch = async (
  userId: number,
  input: CreateMatchInput
): Promise<CreateMatchResult> => {
  const connection = await databasePool.getConnection();

  try {
    const team = await findTeamByIdAndUserId(connection, {
      teamId: input.myTeamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    const matchId = await createMatchRecord(connection, {
      userId,
      myTeamId: input.myTeamId,
      opponentTeamName: input.opponentTeamName,
      matchDate: input.matchDate,
      matchTime: input.matchTime,
      groundName: input.groundName,
      opponentCaptainName: input.opponentCaptainName,
      opponentCaptainNumber: input.opponentCaptainNumber,
      slotStatus: input.slotStatus,
      matchFees: input.matchFees,
      paymentStatus: input.paymentStatus,
      matchStatus: SCHEDULED_MATCH_STATUS
    });

    return {
      match_id: matchId
    };
  } finally {
    connection.release();
  }
};

export const getScheduledMatchesByUserId = async (
  userId: number
): Promise<ScheduledMatchResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    const matches = await findScheduledMatchesByUserId(connection, {
      userId,
      matchStatus: SCHEDULED_MATCH_STATUS
    });

    return matches.map(mapScheduledMatch);
  } finally {
    connection.release();
  }
};

export const getSettledMatchesByUserId = async (
  userId: number
): Promise<SettledMatchResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    const matches = await findSettledMatchesByUserId(connection, {
      userId,
      matchStatuses: [COMPLETED_MATCH_STATUS, CANCELLED_MATCH_STATUS]
    });

    return matches.map(mapSettledMatch);
  } finally {
    connection.release();
  }
};


export const getMatchByIdForUser = async (
  userId: number,
  matchId: number
): Promise<ScheduledMatchResult> => {
  const connection = await databasePool.getConnection();

  try {
    const match = await findMatchByIdAndUserId(connection, {
      matchId,
      userId
    });

    if (!match) {
      throw new AppError('Match not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapScheduledMatch(match);
  } finally {
    connection.release();
  }
};

export const getMatchPlayersByMatchIdForUser = async (
  userId: number,
  matchId: number
): Promise<MatchPlayersResult> => {
  const connection = await databasePool.getConnection();

  try {
    const match = await findMatchByIdAndUserId(connection, {
      matchId,
      userId
    });

    if (!match) {
      throw new AppError('Match not found', HTTP_STATUS.NOT_FOUND);
    }

    const players = await findMatchPlayersByMatchIdAndUserId(connection, {
      matchId,
      userId
    });
    const mappedPlayers = players.map(mapMatchPlayer);

    return {
      match_id: matchId,
      total_player_count: match.total_player_count ?? mappedPlayers.length,
      per_head_expense: mapNullableNumber(match.per_head_expense),
      players: mappedPlayers
    };
  } finally {
    connection.release();
  }
};

export const updateMatchForUser = async (
  userId: number,
  matchId: number,
  input: UpdateMatchInput
): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    const match = await findMatchByIdAndUserId(connection, {
      matchId,
      userId
    });

    if (!match) {
      throw new AppError('Match not found', HTTP_STATUS.NOT_FOUND);
    }

    if (match.match_status !== SCHEDULED_MATCH_STATUS) {
      throw new AppError(
        'Only scheduled matches can be updated',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const team = await findTeamByIdAndUserId(connection, {
      teamId: input.myTeamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    await updateMatchByIdAndUserId(connection, {
      userId,
      matchId,
      myTeamId: input.myTeamId,
      opponentTeamName: input.opponentTeamName,
      matchDate: input.matchDate,
      matchTime: input.matchTime,
      groundName: input.groundName,
      opponentCaptainName: input.opponentCaptainName,
      opponentCaptainNumber: input.opponentCaptainNumber,
      slotStatus: input.slotStatus,
      matchFees: input.matchFees,
      paymentStatus: input.paymentStatus
    });
  } finally {
    connection.release();
  }
};

export const cancelMatchForUser = async (
  userId: number,
  matchId: number
): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    const match = await findMatchByIdAndUserId(connection, {
      matchId,
      userId
    });

    if (!match) {
      throw new AppError('Match not found', HTTP_STATUS.NOT_FOUND);
    }

    if (match.match_status !== SCHEDULED_MATCH_STATUS) {
      throw new AppError(
        'Only scheduled matches can be cancelled',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    await cancelMatchByIdAndUserId(connection, {
      matchId,
      userId,
      matchStatus: CANCELLED_MATCH_STATUS
    });
  } finally {
    connection.release();
  }
};

export const completeMatchForUser = async (
  userId: number,
  matchId: number,
  input: CompleteMatchInput
): Promise<CompleteMatchResult> => {
  const connection = await databasePool.getConnection();
  let hasStartedTransaction = false;

  try {
    await connection.beginTransaction();
    hasStartedTransaction = true;

    const match = await findMatchByIdAndUserId(connection, {
      matchId,
      userId
    });

    if (!match) {
      throw new AppError('Match not found', HTTP_STATUS.NOT_FOUND);
    }

    if (match.match_status !== SCHEDULED_MATCH_STATUS) {
      throw new AppError(
        'Only scheduled matches can be completed',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const uniquePlayerIds = [...new Set(input.playerIds)];
    const players = await findActivePlayersByIdsAndUserId(connection, {
      playerIds: uniquePlayerIds,
      userId
    });

    if (players.length !== uniquePlayerIds.length) {
      throw new AppError(
        'One or more selected players were not found',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const matchFees = Number(match.match_fees ?? 0);
    const totalExpense = roundToTwoDecimals(matchFees + input.ballFees);
    const perHeadExpense = roundToTwoDecimals(totalExpense / input.totalPlayerCount);
    const playerShareCounts = input.playerIds.reduce<Map<number, number>>((counts, playerId) => {
      counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      return counts;
    }, new Map<number, number>());

    const insertedPlayersCount = await createMatchPlayerRecords(
      connection,
      Array.from(playerShareCounts.entries()).map(([playerId, shareCount], index) => ({
        matchId,
        playerId,
        playingPosition: index + 1,
        perHeadExpense: roundToTwoDecimals(perHeadExpense * shareCount)
      }))
    );

    if (insertedPlayersCount !== playerShareCounts.size) {
      throw new AppError('Unable to save match players', HTTP_STATUS.BAD_REQUEST);
    }

    await completeMatchByIdAndUserId(connection, {
      matchId,
      userId,
      matchStatus: COMPLETED_MATCH_STATUS,
      ballFees: input.ballFees,
      totalExpense,
      totalPlayerCount: input.totalPlayerCount,
      perHeadExpense
    });

    await connection.commit();
    hasStartedTransaction = false;

    return {
      match_fees: matchFees,
      ball_fees: input.ballFees,
      total_expense: totalExpense,
      total_player_count: input.totalPlayerCount,
      per_head_expense: perHeadExpense
    };
  } catch (error) {
    if (hasStartedTransaction) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
};
