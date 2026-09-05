INSERT INTO subscription_plans (
  plan_code,
  plan_name,
  description,
  price,
  billing_period,
  duration_days,
  is_active
)
VALUES (
  'QUARTERLY',
  'Quarterly',
  'Three-month quarterly subscription plan.',
  0.00,
  'QUARTERLY',
  90,
  TRUE
)
ON DUPLICATE KEY UPDATE
  plan_name = VALUES(plan_name),
  description = VALUES(description),
  billing_period = VALUES(billing_period),
  duration_days = VALUES(duration_days),
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO plan_features (plan_id, feature_id)
SELECT sp.id, f.id
FROM subscription_plans sp
INNER JOIN features f ON f.feature_code IN (
  'DASHBOARD',
  'TEAM_MANAGEMENT',
  'PLAYER_MANAGEMENT',
  'MATCH_MANAGEMENT',
  'PLAYER_EXPENSES',
  'TEAM_EXPENSES',
  'ADVANCED_REPORTS'
)
WHERE sp.plan_code = 'QUARTERLY';
