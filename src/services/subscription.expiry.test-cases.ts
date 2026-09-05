import {
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  SubscriptionExpiryTestCase
} from '../types/subscription.types';

export const subscriptionExpiryTestCases: SubscriptionExpiryTestCase[] = [
  {
    name: 'FREE subscription is not expired even when end_date is NULL',
    planCode: SUBSCRIPTION_PLAN_CODES.FREE,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'NULL',
    shouldExpire: false,
    shouldHavePremiumAccess: false
  },
  {
    name: 'Active MONTHLY subscription with future end_date keeps premium access',
    planCode: SUBSCRIPTION_PLAN_CODES.MONTHLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'FUTURE',
    shouldExpire: false,
    shouldHavePremiumAccess: true
  },
  {
    name: 'Active MONTHLY subscription with past end_date is expired',
    planCode: SUBSCRIPTION_PLAN_CODES.MONTHLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'PAST',
    shouldExpire: true,
    shouldHavePremiumAccess: false
  },
  {
    name: 'Active QUARTERLY subscription with future end_date keeps premium access',
    planCode: SUBSCRIPTION_PLAN_CODES.QUARTERLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'FUTURE',
    shouldExpire: false,
    shouldHavePremiumAccess: true
  },
  {
    name: 'Active QUARTERLY subscription with past end_date is expired',
    planCode: SUBSCRIPTION_PLAN_CODES.QUARTERLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'PAST',
    shouldExpire: true,
    shouldHavePremiumAccess: false
  },
  {
    name: 'Active YEARLY subscription with future end_date keeps premium access',
    planCode: SUBSCRIPTION_PLAN_CODES.YEARLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'FUTURE',
    shouldExpire: false,
    shouldHavePremiumAccess: true
  },
  {
    name: 'Active YEARLY subscription with past end_date is expired',
    planCode: SUBSCRIPTION_PLAN_CODES.YEARLY,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDateState: 'PAST',
    shouldExpire: true,
    shouldHavePremiumAccess: false
  },
  {
    name: 'CANCELLED paid subscription does not receive premium access',
    planCode: SUBSCRIPTION_PLAN_CODES.MONTHLY,
    status: SUBSCRIPTION_STATUSES.CANCELLED,
    endDateState: 'FUTURE',
    shouldExpire: false,
    shouldHavePremiumAccess: false
  },
  {
    name: 'FAILED paid subscription does not receive premium access',
    planCode: SUBSCRIPTION_PLAN_CODES.YEARLY,
    status: SUBSCRIPTION_STATUSES.FAILED,
    endDateState: 'FUTURE',
    shouldExpire: false,
    shouldHavePremiumAccess: false
  }
];
