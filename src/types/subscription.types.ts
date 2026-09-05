export const SUBSCRIPTION_PLAN_CODES = {
  FREE: 'FREE',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
} as const;

export type SubscriptionPlanCode =
  (typeof SUBSCRIPTION_PLAN_CODES)[keyof typeof SUBSCRIPTION_PLAN_CODES];

export const SUBSCRIPTION_FEATURE_CODES = {
  DASHBOARD: 'DASHBOARD',
  TEAM_MANAGEMENT: 'TEAM_MANAGEMENT',
  PLAYER_MANAGEMENT: 'PLAYER_MANAGEMENT',
  MATCH_MANAGEMENT: 'MATCH_MANAGEMENT',
  PLAYER_EXPENSES: 'PLAYER_EXPENSES',
  TEAM_EXPENSES: 'TEAM_EXPENSES',
  ADVANCED_REPORTS: 'ADVANCED_REPORTS',
  CLOUD_BACKUP: 'CLOUD_BACKUP'
} as const;

export type SubscriptionFeatureCode =
  (typeof SUBSCRIPTION_FEATURE_CODES)[keyof typeof SUBSCRIPTION_FEATURE_CODES];

export const PAID_SUBSCRIPTION_PLAN_CODES = [
  SUBSCRIPTION_PLAN_CODES.MONTHLY,
  SUBSCRIPTION_PLAN_CODES.QUARTERLY,
  SUBSCRIPTION_PLAN_CODES.YEARLY
] as const;

export type PaidSubscriptionPlanCode = (typeof PAID_SUBSCRIPTION_PLAN_CODES)[number];

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES] | string;

export type CurrentSubscription = {
  subscriptionId: number;
  planId: number;
  planCode: SubscriptionPlanCode;
  planName: string;
  status: SubscriptionStatus;
  startDate: Date | string;
  endDate: Date | string | null;
  isPaid: boolean;
  isExpired: boolean;
};

export type SubscriptionPlan = {
  planCode: SubscriptionPlanCode;
  planName: string;
  description: string | null;
  price: number;
  billingPeriod: SubscriptionPlanCode;
  durationDays: number | null;
};

export type SubscriptionExpiryTestCase = {
  name: string;
  planCode: SubscriptionPlanCode;
  status: SubscriptionStatus;
  endDateState: 'NULL' | 'FUTURE' | 'PAST';
  shouldExpire: boolean;
  shouldHavePremiumAccess: boolean;
};

export type SubscriptionFeatureAccessExample = {
  name: string;
  planCode: SubscriptionPlanCode;
  allowedFeatures: SubscriptionFeatureCode[];
  deniedFeatures: SubscriptionFeatureCode[];
};
