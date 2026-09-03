import {
  SUBSCRIPTION_FEATURE_CODES,
  SUBSCRIPTION_PLAN_CODES,
  SubscriptionFeatureAccessExample
} from '../types/subscription.types';

const freeFeatures = [
  SUBSCRIPTION_FEATURE_CODES.DASHBOARD,
  SUBSCRIPTION_FEATURE_CODES.TEAM_MANAGEMENT,
  SUBSCRIPTION_FEATURE_CODES.PLAYER_MANAGEMENT,
  SUBSCRIPTION_FEATURE_CODES.MATCH_MANAGEMENT
];

const monthlyFeatures = [
  ...freeFeatures,
  SUBSCRIPTION_FEATURE_CODES.PLAYER_EXPENSES,
  SUBSCRIPTION_FEATURE_CODES.TEAM_EXPENSES,
  SUBSCRIPTION_FEATURE_CODES.ADVANCED_REPORTS
];

export const subscriptionFeatureAccessExamples: SubscriptionFeatureAccessExample[] = [
  {
    name: 'FREE users receive core management features only',
    planCode: SUBSCRIPTION_PLAN_CODES.FREE,
    allowedFeatures: freeFeatures,
    deniedFeatures: [
      SUBSCRIPTION_FEATURE_CODES.PLAYER_EXPENSES,
      SUBSCRIPTION_FEATURE_CODES.TEAM_EXPENSES,
      SUBSCRIPTION_FEATURE_CODES.ADVANCED_REPORTS,
      SUBSCRIPTION_FEATURE_CODES.CLOUD_BACKUP
    ]
  },
  {
    name: 'MONTHLY users receive all FREE features plus expenses and reports',
    planCode: SUBSCRIPTION_PLAN_CODES.MONTHLY,
    allowedFeatures: monthlyFeatures,
    deniedFeatures: [SUBSCRIPTION_FEATURE_CODES.CLOUD_BACKUP]
  },
  {
    name: 'YEARLY users receive every initial subscription feature',
    planCode: SUBSCRIPTION_PLAN_CODES.YEARLY,
    allowedFeatures: [
      ...monthlyFeatures,
      SUBSCRIPTION_FEATURE_CODES.CLOUD_BACKUP
    ],
    deniedFeatures: []
  }
];
