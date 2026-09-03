import { databasePool } from '../config/database';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createTeamRecord,
  findTeamByIdAndUserId,
  findTeamsByUserId,
  TeamRow,
  updateTeamByIdAndUserId
} from '../repositories/team.repository';
import { AppError } from '../utils/AppError';

export type TeamResult = {
  id: number;
  teamName: string;
};

const mapTeam = (team: TeamRow): TeamResult => ({
  id: team.id,
  teamName: team.team_name
});

export const createTeam = async (
  userId: number,
  teamName: string
): Promise<TeamResult> => {
  const connection = await databasePool.getConnection();

  try {
    const teamId = await createTeamRecord(connection, {
      userId,
      teamName
    });

    return {
      id: teamId,
      teamName
    };
  } finally {
    connection.release();
  }
};

export const getTeamsByUserId = async (userId: number): Promise<TeamResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    const teams = await findTeamsByUserId(connection, userId);

    return teams.map(mapTeam);
  } finally {
    connection.release();
  }
};

export const getTeamByIdForUser = async (
  userId: number,
  teamId: number
): Promise<TeamResult> => {
  const connection = await databasePool.getConnection();

  try {
    const team = await findTeamByIdAndUserId(connection, {
      teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapTeam(team);
  } finally {
    connection.release();
  }
};

export const updateTeamForUser = async (
  userId: number,
  teamId: number,
  teamName: string
): Promise<TeamResult> => {
  const connection = await databasePool.getConnection();

  try {
    await updateTeamByIdAndUserId(connection, {
      teamId,
      userId,
      teamName
    });

    const team = await findTeamByIdAndUserId(connection, {
      teamId,
      userId
    });

    if (!team) {
      throw new AppError('Team not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapTeam(team);
  } finally {
    connection.release();
  }
};
