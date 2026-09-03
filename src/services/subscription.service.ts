import { databasePool } from '../config/database';
import {
  CurrentSubscriptionRow,
  expireActivePaidSubscriptionsByUserId,
  findActiveSubscriptionPlans,
  findCurrentValidSubscriptionByUserId,
  findFeatureAccessBySubscription,
  findLatestActivePaidSubscriptionByUserId,
  findLatestExpiredPaidSubscriptionByUserId,
  SubscriptionPlanRow
} from '../repositories/subscription.repository';
import {
  CurrentSubscription,
  PAID_SUBSCRIPTION_PLAN_CODES,
  SubscriptionFeatureCode,
  SubscriptionPlan
} from '../types/subscription.types';

const isEndDateExpired = (endDate: Date | string | null): boolean => {
  if (!endDate) {
    return false;
  }

  return new Date(endDate).getTime() <= Date.now();
};

const isPaidPlan = (planCode: string): boolean =>
  PAID_SUBSCRIPTION_PLAN_CODES.some((paidPlanCode) => paidPlanCode === planCode);

const mapSubscription = (subscription: CurrentSubscriptionRow): CurrentSubscription => {
  const isExpired = isEndDateExpired(subscription.end_date);

  return {
    subscriptionId: subscription.subscription_id,
    planId: subscription.plan_id,
    planCode: subscription.plan_code,
    planName: subscription.plan_name,
    status: subscription.subscription_status,
    startDate: subscription.start_date,
    endDate: subscription.end_date,
    isPaid: isPaidPlan(subscription.plan_code) && !isExpired,
    isExpired
  };
};

const mapSubscriptionPlan = (plan: SubscriptionPlanRow): SubscriptionPlan => ({
  planCode: plan.plan_code,
  planName: plan.plan_name,
  description: plan.description,
  price: Number(plan.price),
  billingPeriod: plan.billing_period,
  durationDays: plan.duration_days
});

export const getCurrentSubscription = async (
  userId: number
): Promise<CurrentSubscription | null> => {
  const connection = await databasePool.getConnection();

  try {
    await expireActivePaidSubscriptionsByUserId(connection, userId);

    const subscription = await findCurrentValidSubscriptionByUserId(connection, userId);

    if (!subscription) {
      return null;
    }

    return mapSubscription(subscription);
  } finally {
    connection.release();
  }
};

export const hasActivePaidSubscription = async (userId: number): Promise<boolean> => {
  const subscription = await getCurrentSubscription(userId);

  return subscription?.isPaid ?? false;
};

export const getLatestActivePaidSubscription = async (
  userId: number
): Promise<CurrentSubscription | null> => {
  const connection = await databasePool.getConnection();

  try {
    await expireActivePaidSubscriptionsByUserId(connection, userId);

    const subscription = await findLatestActivePaidSubscriptionByUserId(connection, userId);

    return subscription ? mapSubscription(subscription) : null;
  } finally {
    connection.release();
  }
};

export const expireSubscriptionIfNecessary = async (userId: number): Promise<number> => {
  const connection = await databasePool.getConnection();

  try {
    return await expireActivePaidSubscriptionsByUserId(connection, userId);
  } finally {
    connection.release();
  }
};

export const getLatestExpiredPaidSubscription = async (
  userId: number
): Promise<CurrentSubscription | null> => {
  const connection = await databasePool.getConnection();

  try {
    await expireActivePaidSubscriptionsByUserId(connection, userId);

    const subscription = await findLatestExpiredPaidSubscriptionByUserId(connection, userId);

    return subscription ? mapSubscription(subscription) : null;
  } finally {
    connection.release();
  }
};

export const getActiveSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const connection = await databasePool.getConnection();

  try {
    const plans = await findActiveSubscriptionPlans(connection);

    return plans.map(mapSubscriptionPlan);
  } finally {
    connection.release();
  }
};

export const hasFeature = async (
  userId: number,
  featureCode: SubscriptionFeatureCode
): Promise<boolean> => {
  const connection = await databasePool.getConnection();

  try {
    await expireActivePaidSubscriptionsByUserId(connection, userId);

    const subscription = await findCurrentValidSubscriptionByUserId(connection, userId);

    if (!subscription) {
      return false;
    }

    const featureAccess = await findFeatureAccessBySubscription(connection, {
      userId,
      subscriptionId: subscription.subscription_id,
      planId: subscription.plan_id,
      featureCode
    });

    return Boolean(featureAccess);
  } finally {
    connection.release();
  }
};
