import { databasePool } from '../config/database';
import {
  findDashboardOverallSummaryByUserId,
  findDashboardTeamSummaryByUserId
} from '../repositories/dashboard.repository';
import { COMPLETED_MATCH_STATUS, SCHEDULED_MATCH_STATUS } from './match.service';
import { calculateTeamExpenseSummary } from './team-expense.service';

export type DashboardTeamSummary = {
  team_id: number;
  team_name: string;
  total_team_balance: number;
  total_squad_count: number;
  total_matches_scheduled: number;
};

export type DashboardSummaryResult = {
  team_wise_summary: DashboardTeamSummary[];
  overall_summary: {
    total_team_balance: number;
    total_squad_count: number;
    total_matches_scheduled: number;
  };
};

const toCount = (value: number | string | undefined): number => Number(value ?? 0);

export const getDashboardSummaryByUserId = async (
  userId: number
): Promise<DashboardSummaryResult> => {
  const connection = await databasePool.getConnection();

  try {
    const teamRows = await findDashboardTeamSummaryByUserId(connection, {
      userId,
      scheduledMatchStatus: SCHEDULED_MATCH_STATUS,
      completedMatchStatus: COMPLETED_MATCH_STATUS
    });
    const overallRow = await findDashboardOverallSummaryByUserId(connection, {
      userId,
      scheduledMatchStatus: SCHEDULED_MATCH_STATUS,
      completedMatchStatus: COMPLETED_MATCH_STATUS
    });

    const teamWiseSummary = teamRows.map((team) => {
      const expenseSummary = calculateTeamExpenseSummary(team);

      return {
        team_id: team.team_id,
        team_name: team.team_name,
        total_team_balance: expenseSummary.totalTeamBalance,
        total_squad_count: toCount(team.total_squad_count),
        total_matches_scheduled: toCount(team.total_matches_scheduled)
      };
    });
    const overallExpenseSummary = calculateTeamExpenseSummary(overallRow);

    return {
      team_wise_summary: teamWiseSummary,
      overall_summary: {
        total_team_balance: overallExpenseSummary.totalTeamBalance,
        total_squad_count: toCount(overallRow?.total_squad_count),
        total_matches_scheduled: toCount(overallRow?.total_matches_scheduled)
      }
    };
  } finally {
    connection.release();
  }
};
