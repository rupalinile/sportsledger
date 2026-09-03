import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type DashboardTeamSummaryRow = RowDataPacket & {
  team_id: number;
  team_name: string;
  total_deposited_amount: number | string;
  total_match_expense_amount: number | string;
  other_deposited_amount: number | string;
  other_expense_amount: number | string;
  total_squad_count: number | string;
  total_matches_scheduled: number | string;
};

export const findDashboardTeamSummaryByUserId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    scheduledMatchStatus: string;
    completedMatchStatus: string;
  }
): Promise<DashboardTeamSummaryRow[]> => {
  const [rows] = await connection.query<DashboardTeamSummaryRow[]>(
    `SELECT
        t.id AS team_id,
        t.team_name,
        COALESCE(player_deposits.total_deposited_amount, 0) AS total_deposited_amount,
        COALESCE(match_expenses.total_match_expense_amount, 0) AS total_match_expense_amount,
        COALESCE(team_deposits.other_deposited_amount, 0) AS other_deposited_amount,
        COALESCE(team_expenses.other_expense_amount, 0) AS other_expense_amount,
        COALESCE(squad_counts.total_squad_count, 0) AS total_squad_count,
        COALESCE(scheduled_matches.total_matches_scheduled, 0) AS total_matches_scheduled
      FROM teams t
      LEFT JOIN (
        SELECT
          team_scope.id AS team_id,
          SUM(pd.amount) AS total_deposited_amount
        FROM teams team_scope
        INNER JOIN player_deposits pd
          ON pd.user_id = team_scope.user_id
        INNER JOIN players p
          ON p.id = pd.player_id
          AND p.user_id = pd.user_id
          AND p.is_active = 1
        WHERE team_scope.user_id = ?
          AND EXISTS (
            SELECT 1
            FROM player_teams pt
            WHERE pt.user_id = pd.user_id
              AND pt.player_id = pd.player_id
              AND pt.team_id = team_scope.id
          )
        GROUP BY team_scope.id
      ) player_deposits
        ON player_deposits.team_id = t.id
      LEFT JOIN (
        SELECT
          m.my_team_id AS team_id,
          SUM(mp.per_head_expense) AS total_match_expense_amount
        FROM match_players mp
        INNER JOIN matches m
          ON m.id = mp.match_id
          AND m.user_id = ?
          AND m.match_status = ?
        INNER JOIN players p
          ON p.id = mp.player_id
          AND p.user_id = m.user_id
          AND p.is_active = 1
        GROUP BY m.my_team_id
      ) match_expenses
        ON match_expenses.team_id = t.id
      LEFT JOIN (
        SELECT
          tt.team_id,
          SUM(tt.amount) AS other_deposited_amount
        FROM team_transactions tt
        INNER JOIN teams team_scope
          ON team_scope.id = tt.team_id
          AND team_scope.user_id = ?
        WHERE tt.category = 'DEPOSITED'
        GROUP BY tt.team_id
      ) team_deposits
        ON team_deposits.team_id = t.id
      LEFT JOIN (
        SELECT
          tt.team_id,
          SUM(tt.amount) AS other_expense_amount
        FROM team_transactions tt
        INNER JOIN teams team_scope
          ON team_scope.id = tt.team_id
          AND team_scope.user_id = ?
        WHERE tt.category = 'EXPENSE'
        GROUP BY tt.team_id
      ) team_expenses
        ON team_expenses.team_id = t.id
      LEFT JOIN (
        SELECT
          pt.team_id,
          COUNT(DISTINCT pt.player_id) AS total_squad_count
        FROM player_teams pt
        INNER JOIN players p
          ON p.id = pt.player_id
          AND p.user_id = pt.user_id
          AND p.is_active = 1
        WHERE pt.user_id = ?
        GROUP BY pt.team_id
      ) squad_counts
        ON squad_counts.team_id = t.id
      LEFT JOIN (
        SELECT
          my_team_id AS team_id,
          COUNT(*) AS total_matches_scheduled
        FROM matches
        WHERE user_id = ?
          AND match_status = ?
        GROUP BY my_team_id
      ) scheduled_matches
        ON scheduled_matches.team_id = t.id
      WHERE t.user_id = ?
      ORDER BY t.id DESC`,
    [
      params.userId,
      params.userId,
      params.completedMatchStatus,
      params.userId,
      params.userId,
      params.userId,
      params.userId,
      params.scheduledMatchStatus,
      params.userId
    ]
  );

  return rows;
};

export type DashboardOverallSummaryRow = RowDataPacket & {
  total_deposited_amount: number | string;
  total_match_expense_amount: number | string;
  other_deposited_amount: number | string;
  other_expense_amount: number | string;
  total_squad_count: number | string;
  total_matches_scheduled: number | string;
};

export const findDashboardOverallSummaryByUserId = async (
  connection: PoolConnection,
  params: {
    userId: number;
    scheduledMatchStatus: string;
    completedMatchStatus: string;
  }
): Promise<DashboardOverallSummaryRow> => {
  const [rows] = await connection.query<DashboardOverallSummaryRow[]>(
    `SELECT
        COALESCE((
          SELECT SUM(pd.amount)
          FROM player_deposits pd
          INNER JOIN players p
            ON p.id = pd.player_id
            AND p.user_id = pd.user_id
            AND p.is_active = 1
          WHERE pd.user_id = ?
        ), 0) AS total_deposited_amount,
        COALESCE((
          SELECT SUM(mp.per_head_expense)
          FROM match_players mp
          INNER JOIN matches m
            ON m.id = mp.match_id
            AND m.user_id = ?
            AND m.match_status = ?
          INNER JOIN players p
            ON p.id = mp.player_id
            AND p.user_id = m.user_id
            AND p.is_active = 1
        ), 0) AS total_match_expense_amount,
        COALESCE((
          SELECT SUM(tt.amount)
          FROM team_transactions tt
          INNER JOIN teams t
            ON t.id = tt.team_id
            AND t.user_id = ?
          WHERE tt.category = 'DEPOSITED'
        ), 0) AS other_deposited_amount,
        COALESCE((
          SELECT SUM(tt.amount)
          FROM team_transactions tt
          INNER JOIN teams t
            ON t.id = tt.team_id
            AND t.user_id = ?
          WHERE tt.category = 'EXPENSE'
        ), 0) AS other_expense_amount,
        COALESCE((
          SELECT COUNT(*)
          FROM players
          WHERE user_id = ?
            AND is_active = 1
        ), 0) AS total_squad_count,
        COALESCE((
          SELECT COUNT(*)
          FROM matches
          WHERE user_id = ?
            AND match_status = ?
        ), 0) AS total_matches_scheduled`,
    [
      params.userId,
      params.userId,
      params.completedMatchStatus,
      params.userId,
      params.userId,
      params.userId,
      params.userId,
      params.scheduledMatchStatus
    ]
  );

  return rows[0];
};
