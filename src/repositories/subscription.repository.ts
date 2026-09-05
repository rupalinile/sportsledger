import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  PAID_SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  SubscriptionFeatureCode,
  SubscriptionPlanCode
} from '../types/subscription.types';

export type CurrentSubscriptionRow = RowDataPacket & {
  subscription_id: number;
  plan_id: number;
  plan_code: SubscriptionPlanCode;
  plan_name: string;
  subscription_status: string;
  start_date: Date | string;
  end_date: Date | string | null;
};

export type SubscriptionPlanRow = RowDataPacket & {
  plan_code: SubscriptionPlanCode;
  plan_name: string;
  description: string | null;
  price: number | string;
  billing_period: SubscriptionPlanCode;
  duration_days: number | null;
};

type FeatureAccessRow = RowDataPacket & {
  feature_id: number;
};

export const findCurrentValidSubscriptionByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<CurrentSubscriptionRow | null> => {
  const [rows] = await connection.query<CurrentSubscriptionRow[]>(
    `SELECT
        us.id AS subscription_id,
        sp.id AS plan_id,
        sp.plan_code,
        sp.plan_name,
        us.subscription_status,
        us.start_date,
        us.end_date
      FROM user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ?
        AND us.subscription_status = ?
        AND sp.is_active = TRUE
        AND sp.plan_code IN (?, ?, ?, ?)
        AND (us.end_date IS NULL OR us.end_date > NOW())
      ORDER BY
        CASE WHEN sp.plan_code IN (?, ?, ?) THEN 1 ELSE 0 END DESC,
        us.start_date DESC,
        us.id DESC
      LIMIT 1`,
    [
      userId,
      SUBSCRIPTION_STATUSES.ACTIVE,
      SUBSCRIPTION_PLAN_CODES.FREE,
      SUBSCRIPTION_PLAN_CODES.MONTHLY,
      SUBSCRIPTION_PLAN_CODES.QUARTERLY,
      SUBSCRIPTION_PLAN_CODES.YEARLY,
      ...PAID_SUBSCRIPTION_PLAN_CODES
    ]
  );

  return rows[0] ?? null;
};

export const findFeatureAccessBySubscription = async (
  connection: PoolConnection,
  params: {
    userId: number;
    subscriptionId: number;
    planId: number;
    featureCode: SubscriptionFeatureCode;
  }
): Promise<FeatureAccessRow | null> => {
  const [rows] = await connection.query<FeatureAccessRow[]>(
    `SELECT f.id AS feature_id
      FROM user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
      INNER JOIN plan_features pf ON pf.plan_id = sp.id
      INNER JOIN features f ON f.id = pf.feature_id
      WHERE us.id = ?
        AND us.user_id = ?
        AND us.plan_id = ?
        AND us.subscription_status = ?
        AND sp.is_active = TRUE
        AND f.is_active = TRUE
        AND f.feature_code = ?
        AND (us.end_date IS NULL OR us.end_date > NOW())
      LIMIT 1`,
    [
      params.subscriptionId,
      params.userId,
      params.planId,
      SUBSCRIPTION_STATUSES.ACTIVE,
      params.featureCode
    ]
  );

  return rows[0] ?? null;
};

export const findActiveSubscriptionPlans = async (
  connection: PoolConnection
): Promise<SubscriptionPlanRow[]> => {
  const [rows] = await connection.query<SubscriptionPlanRow[]>(
    `SELECT
        plan_code,
        plan_name,
        description,
        price,
        billing_period,
        duration_days
      FROM subscription_plans
      WHERE is_active = TRUE
        AND plan_code IN (?, ?, ?, ?)
      ORDER BY CASE plan_code
        WHEN ? THEN 1
        WHEN ? THEN 2
        WHEN ? THEN 3
        WHEN ? THEN 4
        ELSE 5
      END`,
    [
      SUBSCRIPTION_PLAN_CODES.FREE,
      SUBSCRIPTION_PLAN_CODES.MONTHLY,
      SUBSCRIPTION_PLAN_CODES.QUARTERLY,
      SUBSCRIPTION_PLAN_CODES.YEARLY,
      SUBSCRIPTION_PLAN_CODES.FREE,
      SUBSCRIPTION_PLAN_CODES.MONTHLY,
      SUBSCRIPTION_PLAN_CODES.QUARTERLY,
      SUBSCRIPTION_PLAN_CODES.YEARLY
    ]
  );

  return rows;
};

export const expireActivePaidSubscriptionsByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
     SET us.subscription_status = ?
     WHERE us.user_id = ?
       AND us.subscription_status = ?
       AND sp.plan_code IN (?, ?, ?)
       AND us.end_date IS NOT NULL
       AND us.end_date <= NOW()`,
    [
      SUBSCRIPTION_STATUSES.EXPIRED,
      userId,
      SUBSCRIPTION_STATUSES.ACTIVE,
      ...PAID_SUBSCRIPTION_PLAN_CODES
    ]
  );

  return result.affectedRows;
};

export const findLatestActivePaidSubscriptionByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<CurrentSubscriptionRow | null> => {
  const [rows] = await connection.query<CurrentSubscriptionRow[]>(
    `SELECT
        us.id AS subscription_id,
        sp.id AS plan_id,
        sp.plan_code,
        sp.plan_name,
        us.subscription_status,
        us.start_date,
        us.end_date
      FROM user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ?
        AND us.subscription_status = ?
        AND sp.is_active = TRUE
        AND sp.plan_code IN (?, ?, ?)
      ORDER BY
        us.start_date DESC,
        us.id DESC
      LIMIT 1`,
    [
      userId,
      SUBSCRIPTION_STATUSES.ACTIVE,
      ...PAID_SUBSCRIPTION_PLAN_CODES
    ]
  );

  return rows[0] ?? null;
};

export const findLatestExpiredPaidSubscriptionByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<CurrentSubscriptionRow | null> => {
  const [rows] = await connection.query<CurrentSubscriptionRow[]>(
    `SELECT
        us.id AS subscription_id,
        sp.id AS plan_id,
        sp.plan_code,
        sp.plan_name,
        us.subscription_status,
        us.start_date,
        us.end_date
      FROM user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ?
        AND us.subscription_status = ?
        AND sp.is_active = TRUE
        AND sp.plan_code IN (?, ?, ?)
        AND us.end_date IS NOT NULL
        AND us.end_date <= NOW()
      ORDER BY
        us.start_date DESC,
        us.id DESC
      LIMIT 1`,
    [
      userId,
      SUBSCRIPTION_STATUSES.EXPIRED,
      ...PAID_SUBSCRIPTION_PLAN_CODES
    ]
  );

  return rows[0] ?? null;
};
