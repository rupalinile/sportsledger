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
  total_scheduled_matches_amount: number;
  scheduled_paid_matches_amount: number;
  scheduled_pending_matches_amount: number;
};

export type DashboardSummaryResult = {
  team_wise_summary: DashboardTeamSummary[];
  overall_summary: {
    total_team_balance: number;
    total_squad_count: number;
    total_matches_scheduled: number;
    total_scheduled_matches_amount: number;
    scheduled_paid_matches_amount: number;
    scheduled_pending_matches_amount: number;
  };
};

const toCount = (value: number | string | undefined): number => Number(value ?? 0);
const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;
const toAmount = (value: number | string | undefined): number =>
  roundToTwoDecimals(Number(value ?? 0));

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
        total_matches_scheduled: toCount(team.total_matches_scheduled),
        total_scheduled_matches_amount: toAmount(team.total_scheduled_matches_amount),
        scheduled_paid_matches_amount: toAmount(team.scheduled_paid_matches_amount),
        scheduled_pending_matches_amount: toAmount(team.scheduled_pending_matches_amount)
      };
    });
    const overallExpenseSummary = calculateTeamExpenseSummary(overallRow);

    return {
      team_wise_summary: teamWiseSummary,
      overall_summary: {
        total_team_balance: overallExpenseSummary.totalTeamBalance,
        total_squad_count: toCount(overallRow?.total_squad_count),
        total_matches_scheduled: toCount(overallRow?.total_matches_scheduled),
        total_scheduled_matches_amount: toAmount(overallRow?.total_scheduled_matches_amount),
        scheduled_paid_matches_amount: toAmount(overallRow?.scheduled_paid_matches_amount),
        scheduled_pending_matches_amount: toAmount(overallRow?.scheduled_pending_matches_amount)
      }
    };
  } finally {
    connection.release();
  }
};
