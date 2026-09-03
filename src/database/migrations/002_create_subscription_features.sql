CREATE TABLE features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feature_code VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE plan_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  feature_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_features_plan
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_plan_features_feature
    FOREIGN KEY (feature_id) REFERENCES features(id)
    ON DELETE CASCADE,
  CONSTRAINT uq_plan_features_plan_feature UNIQUE (plan_id, feature_id),
  INDEX idx_plan_features_plan (plan_id),
  INDEX idx_plan_features_feature (feature_id)
);

INSERT INTO features (feature_code, feature_name, description)
VALUES
  ('DASHBOARD', 'Dashboard', 'Access to the CrickTrack dashboard.'),
  ('TEAM_MANAGEMENT', 'Team Management', 'Create and manage cricket teams.'),
  ('PLAYER_MANAGEMENT', 'Player Management', 'Create and manage player profiles.'),
  ('MATCH_MANAGEMENT', 'Match Management', 'Create and manage cricket matches.'),
  ('PLAYER_EXPENSES', 'Player Expenses', 'Track and manage player-level expenses.'),
  ('TEAM_EXPENSES', 'Team Expenses', 'Track and manage team-level expenses.'),
  ('ADVANCED_REPORTS', 'Advanced Reports', 'Access advanced reporting and analytics.'),
  ('CLOUD_BACKUP', 'Cloud Backup', 'Back up CrickTrack data to cloud storage.')
ON DUPLICATE KEY UPDATE
  feature_name = VALUES(feature_name),
  description = VALUES(description),
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO plan_features (plan_id, feature_id)
SELECT sp.id, f.id
FROM subscription_plans sp
INNER JOIN features f ON f.feature_code IN (
  'DASHBOARD',
  'TEAM_MANAGEMENT',
  'PLAYER_MANAGEMENT',
  'MATCH_MANAGEMENT'
)
WHERE sp.plan_code = 'FREE';

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
WHERE sp.plan_code = 'MONTHLY';

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
  'ADVANCED_REPORTS',
  'CLOUD_BACKUP'
)
WHERE sp.plan_code = 'YEARLY';
