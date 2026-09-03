import { databasePool } from '../config/database';
import { HTTP_STATUS } from '../constants/http-status';
import {
  createPlayerDepositRecord,
  findPlayerDepositByIdAndUserId,
  findPlayerDepositsByUserId,
  PlayerDepositHistoryRow,
  PlayerDepositRow,
  updatePlayerDepositByIdAndUserId
} from '../repositories/player-deposit.repository';
import { findActivePlayerByIdAndUserId } from '../repositories/player.repository';
import { AppError } from '../utils/AppError';

export type PlayerDepositResult = {
  id: number;
  player_id: number;
  deposit_date: string;
  amount: number;
  notes: string | null;
};

export type PlayerDepositHistoryResult = PlayerDepositResult & {
  player_name: string;
};

const formatDateOnly = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const mapPlayerDeposit = (deposit: PlayerDepositRow): PlayerDepositResult => ({
  id: deposit.id,
  player_id: deposit.player_id,
  deposit_date: formatDateOnly(deposit.deposit_date),
  amount: Number(deposit.amount),
  notes: deposit.notes
});

const mapPlayerDepositHistory = (
  deposit: PlayerDepositHistoryRow
): PlayerDepositHistoryResult => ({
  id: deposit.id,
  player_id: deposit.player_id,
  player_name: deposit.player_name,
  deposit_date: formatDateOnly(deposit.deposit_date),
  amount: Number(deposit.amount),
  notes: deposit.notes
});

export const createPlayerDeposit = async (
  userId: number,
  input: {
    playerId: number;
    depositDate: string;
    amount: number;
    notes?: string;
  }
): Promise<PlayerDepositResult> => {
  const connection = await databasePool.getConnection();

  try {
    const player = await findActivePlayerByIdAndUserId(connection, {
      playerId: input.playerId,
      userId
    });

    if (!player) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }

    const depositId = await createPlayerDepositRecord(connection, {
      userId,
      playerId: input.playerId,
      depositDate: input.depositDate,
      amount: input.amount,
      notes: input.notes
    });

    const deposit = await findPlayerDepositByIdAndUserId(connection, {
      depositId,
      userId
    });

    if (!deposit) {
      throw new AppError('Player deposit not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapPlayerDeposit(deposit);
  } finally {
    connection.release();
  }
};

export const updatePlayerDepositForUser = async (
  userId: number,
  depositId: number,
  input: {
    playerId: number;
    depositDate: string;
    amount: number;
    notes?: string;
  }
): Promise<PlayerDepositResult> => {
  const connection = await databasePool.getConnection();

  try {
    const existingDeposit = await findPlayerDepositByIdAndUserId(connection, {
      depositId,
      userId
    });

    if (!existingDeposit) {
      throw new AppError('Player deposit not found', HTTP_STATUS.NOT_FOUND);
    }

    const player = await findActivePlayerByIdAndUserId(connection, {
      playerId: input.playerId,
      userId
    });

    if (!player) {
      throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
    }

    await updatePlayerDepositByIdAndUserId(connection, {
      depositId,
      userId,
      playerId: input.playerId,
      depositDate: input.depositDate,
      amount: input.amount,
      notes: input.notes
    });

    const updatedDeposit = await findPlayerDepositByIdAndUserId(connection, {
      depositId,
      userId
    });

    if (!updatedDeposit) {
      throw new AppError('Player deposit not found', HTTP_STATUS.NOT_FOUND);
    }

    return mapPlayerDeposit(updatedDeposit);
  } finally {
    connection.release();
  }
};

export const getPlayerDepositsByUserId = async (
  userId: number,
  filters: {
    playerId?: number;
    fromDate?: string;
    toDate?: string;
  }
): Promise<PlayerDepositHistoryResult[]> => {
  const connection = await databasePool.getConnection();

  try {
    if (filters.playerId) {
      const player = await findActivePlayerByIdAndUserId(connection, {
        playerId: filters.playerId,
        userId
      });

      if (!player) {
        throw new AppError('Player not found', HTTP_STATUS.NOT_FOUND);
      }
    }

    const deposits = await findPlayerDepositsByUserId(connection, {
      userId,
      playerId: filters.playerId,
      fromDate: filters.fromDate,
      toDate: filters.toDate
    });

    return deposits.map(mapPlayerDepositHistory);
  } finally {
    connection.release();
  }
};
