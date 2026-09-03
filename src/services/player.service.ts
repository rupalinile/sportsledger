import { databasePool } from '../config/database';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createPlayerRecord,
  createPlayerTeamRecord,
  deletePlayerTeamRecordsByPlayerIdAndUserId,
  findActivePlayerByIdAndUserId,
  findActivePlayersByTeamId,
  findActivePlayersByUserId,
  findActivePlayersWithoutTeamByUserId,
  PlayerRow,
  softDeletePlayerByIdAndUserId,
  updatePlayerByIdAndUserId
} from '../repositories/player.repository';
import { findTeamByIdAndUserId } from '../repositories/team.repository';
import { AppError } from '../utils/AppError';

export type PlayerResult = {
  id: number;
  player_name: string;
  mobile_number: string | null;
  team_id: number;
  team_name: string | null;
  is_active: number;
};

const mapPlayer = (player: PlayerRow): PlayerResult => ({
  id: player.id,
  player_name: player.player_name,
  mobile_number: player.mobile_number,
  team_id: player.team_id ?? 0,
  team_name: player.team_name,
  is_active: player.is_active
});

export const createPlayer = async (
  userId: number,
  input: {
    playerName: string;
    mobileNumber?: string;
    teamId: number;
  }
): Promise<PlayerResult> => {
  const [player] = await createPlayers(userId, [input]);

  return player;
};

export const createPlayers = async (
  userId: number,
  inputs: {
    playerName: string;
    mobileNumber?: string;
    teamId: number;
  }[]
): Promise<PlayerResult[]> => {
  const connection = await databasePool.getConnection();
  let hasStartedTransaction = false;

  try {
    await connection.beginTransaction();
    hasStartedTransaction = true;

    const players: PlayerResult[] = [];

    for (const input of inputs) {
      const team =
        input.teamId > 0
          ? await findTeamByIdAndUserId(connection, {
              teamId: input.teamId,
              userId
            })
          : null;

      if (input.teamId > 0 && !team) {
        throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
      }

      const playerId = await createPlayerRecord(connection, {
        userId,
        playerName: input.playerName,
        mobileNumber: input.mobileNumber
      });

      if (input.teamId > 0) {
        await createPlayerTeamRecord(connection, {
          userId,
          playerId,
          teamId: input.teamId
        });
      }

      players.push({
        id: playerId,
        player_name: input.playerName,
        mobile_number: input.mobileNumber ?? null,
        team_id: team?.id ?? 0,
        team_name: team?.team_name ?? null,
        is_active: 1
      });
    }

    await connection.commit();
    hasStartedTransaction = false;

    return players;
  } catch (error) {
    if (hasStartedTransaction) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const getPlayersByUserId = async (
  userId: number,
  teamId?: number
): Promise<PlayerResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    if (teamId === 0) {
      const players = await findActivePlayersWithoutTeamByUserId(connection, userId);

      return players.map(mapPlayer);
    }

    if (teamId && teamId > 0) {
      const team = await findTeamByIdAndUserId(connection, {
        teamId,
        userId
      });

      if (!team) {
        throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
      }

      const players = await findActivePlayersByTeamId(connection, {
        userId,
        teamId
      });

      return players.map(mapPlayer);
    }

    const players = await findActivePlayersByUserId(connection, userId);

    return players.map(mapPlayer);
  } finally {
    connection.release();
  }
};

export const getPlayerByIdForUser = async (
  userId: number,
  playerId: number
): Promise<PlayerResult> => {
  const connection = await databasePool.getConnection();

  try {
    const player = await findActivePlayerByIdAndUserId(connection, {
      playerId,
      userId
    });

    if (!player) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapPlayer(player);
  } finally {
    connection.release();
  }
};

export const updatePlayerForUser = async (
  userId: number,
  playerId: number,
  input: {
    playerName: string;
    mobileNumber?: string;
    teamId: number;
  }
): Promise<PlayerResult> => {
  const connection = await databasePool.getConnection();
  let hasStartedTransaction = false;

  try {
    await connection.beginTransaction();
    hasStartedTransaction = true;

    const player = await findActivePlayerByIdAndUserId(connection, {
      playerId,
      userId
    });

    if (!player) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }

    const team =
      input.teamId > 0
        ? await findTeamByIdAndUserId(connection, {
            teamId: input.teamId,
            userId
          })
        : null;

    if (input.teamId > 0 && !team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    await updatePlayerByIdAndUserId(connection, {
      playerId,
      userId,
      playerName: input.playerName,
      mobileNumber: input.mobileNumber
    });

    await deletePlayerTeamRecordsByPlayerIdAndUserId(connection, {
      playerId,
      userId
    });

    if (input.teamId > 0) {
      await createPlayerTeamRecord(connection, {
        userId,
        playerId,
        teamId: input.teamId
      });
    }

    await connection.commit();
    hasStartedTransaction = false;

    return {
      id: playerId,
      player_name: input.playerName,
      mobile_number: input.mobileNumber ?? null,
      team_id: team?.id ?? 0,
      team_name: team?.team_name ?? null,
      is_active: 1
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

export const deletePlayerForUser = async (
  userId: number,
  playerId: number
): Promise<void> => {
  const connection = await databasePool.getConnection();

  try {
    const affectedRows = await softDeletePlayerByIdAndUserId(connection, {
      playerId,
      userId
    });

    if (affectedRows === 0) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }
  } finally {
    connection.release();
  }
};
