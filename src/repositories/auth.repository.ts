import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type UserRecord = {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
};

type UserIdRow = RowDataPacket & {
  id: number;
};

export type AuthUserRow = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  full_name: string | null;
  status: 'ACTIVE' | 'BLOCKED' | string;
};

export type AuthUserPasswordRow = RowDataPacket & {
  id: number;
  password_hash: string;
  status: 'ACTIVE' | 'BLOCKED' | string;
};

export type PasswordResetUserRow = RowDataPacket & {
  id: number;
  full_name: string | null;
  email: string | null;
};

export type CurrentUserRow = RowDataPacket & {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  status: 'ACTIVE' | 'BLOCKED' | string;
  email_verified: boolean | number;
  phone_verified: boolean | number;
  created_at: Date | string;
};

type PlanRow = RowDataPacket & {
  id: number;
  plan_code: string;
};

export type ActiveSubscriptionRow = RowDataPacket & {
  plan_code: string;
  plan_name: string;
  subscription_status: string;
  start_date: Date | string;
  end_date: Date | string | null;
};

export type RefreshTokenRow = RowDataPacket & {
  id: number;
  user_id: number;
  device_id: string | null;
  device_name: string | null;
  expires_at: Date | string;
  revoked_at: Date | string | null;
};

export type PasswordResetOtpRow = RowDataPacket & {
  id: number;
  user_id: number;
  expires_at: Date | string;
  verified_at: Date | string | null;
  used_at: Date | string | null;
  attempt_count: number;
  resend_count: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type LatestPasswordResetOtpRow = RowDataPacket & {
  id: number;
  created_at: Date | string;
};

export type ResendablePasswordResetOtpRow = RowDataPacket & {
  id: number;
  resend_count: number;
  created_at: Date | string;
};

export type PasswordResetOtpVerificationRow = RowDataPacket & {
  id: number;
  otp_hash: string;
  attempt_count: number;
};

export type VerifiedPasswordResetOtpRow = RowDataPacket & {
  id: number;
  user_id: number;
};

export type CreateUserParams = {
  username: string;
  passwordHash: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  status: 'ACTIVE';
};

export type CreatePasswordResetOtpParams = {
  userId: number;
  otpHash: string;
  expiresAt: Date;
  resendCount?: number;
};

export const findUserByUsername = async (
  connection: PoolConnection,
  username: string
): Promise<UserIdRow | null> => {
  const [rows] = await connection.query<UserIdRow[]>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  return rows[0] ?? null;
};

export const findUserByEmail = async (
  connection: PoolConnection,
  email: string
): Promise<UserIdRow | null> => {
  const [rows] = await connection.query<UserIdRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  return rows[0] ?? null;
};

export const findAuthUserByUsername = async (
  connection: PoolConnection,
  username: string
): Promise<AuthUserRow | null> => {
  const [rows] = await connection.query<AuthUserRow[]>(
    `SELECT id, username, password_hash, full_name, status
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] ?? null;
};

export const findAuthUserPasswordByIdForUpdate = async (
  connection: PoolConnection,
  userId: number
): Promise<AuthUserPasswordRow | null> => {
  const [rows] = await connection.query<AuthUserPasswordRow[]>(
    `SELECT id, password_hash, status
     FROM users
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [userId]
  );

  return rows[0] ?? null;
};

export const findActivePasswordResetUserByUsername = async (
  connection: PoolConnection,
  username: string
): Promise<PasswordResetUserRow | null> => {
  const [rows] = await connection.query<PasswordResetUserRow[]>(
    `SELECT id, full_name, email
     FROM users
     WHERE username = ?
       AND status = ?
     LIMIT 1`,
    [username, 'ACTIVE']
  );

  return rows[0] ?? null;
};

export const findCurrentUserById = async (
  connection: PoolConnection,
  userId: number
): Promise<CurrentUserRow | null> => {
  const [rows] = await connection.query<CurrentUserRow[]>(
    `SELECT
        id,
        username,
        full_name,
        email,
        phone_number,
        status,
        email_verified,
        phone_verified,
        created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
};

export const createUser = async (
  connection: PoolConnection,
  params: CreateUserParams
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO users
      (username, password_hash, full_name, email, phone_number, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.username,
      params.passwordHash,
      params.fullName,
      params.email,
      params.phoneNumber,
      params.status
    ]
  );

  return result.insertId;
};

export const findCurrentActiveSubscriptionByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<ActiveSubscriptionRow | null> => {
  const [rows] = await connection.query<ActiveSubscriptionRow[]>(
    `SELECT
        sp.plan_code,
        sp.plan_name,
        us.subscription_status,
        us.start_date,
        us.end_date
      FROM user_subscriptions us
      INNER JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ?
        AND us.subscription_status = ?
        AND (us.end_date IS NULL OR us.end_date >= NOW())
      ORDER BY us.start_date DESC
      LIMIT 1`,
    [userId, 'ACTIVE']
  );

  return rows[0] ?? null;
};

export const findRefreshTokenByHashForUpdate = async (
  connection: PoolConnection,
  tokenHash: string
): Promise<RefreshTokenRow | null> => {
  const [rows] = await connection.query<RefreshTokenRow[]>(
    `SELECT
        id,
        user_id,
        device_id,
        device_name,
        expires_at,
        revoked_at
      FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1
      FOR UPDATE`,
    [tokenHash]
  );

  return rows[0] ?? null;
};

export const createRefreshToken = async (
  connection: PoolConnection,
  params: {
    userId: number;
    tokenHash: string;
    deviceId: string | null;
    deviceName: string | null;
    expiresAt: Date;
  }
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `INSERT INTO refresh_tokens
      (user_id, token_hash, device_id, device_name, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      params.userId,
      params.tokenHash,
      params.deviceId,
      params.deviceName,
      params.expiresAt
    ]
  );
};

export const findLatestUnusedPasswordResetOtpByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<LatestPasswordResetOtpRow | null> => {
  const [rows] = await connection.query<LatestPasswordResetOtpRow[]>(
    `SELECT id, created_at
     FROM password_reset_otps
     WHERE user_id = ?
       AND verified_at IS NULL
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
};

export const findLatestValidPasswordResetOtpByUserIdForUpdate = async (
  connection: PoolConnection,
  userId: number
): Promise<PasswordResetOtpVerificationRow | null> => {
  const [rows] = await connection.query<PasswordResetOtpVerificationRow[]>(
    `SELECT id, otp_hash, attempt_count
     FROM password_reset_otps
     WHERE user_id = ?
       AND used_at IS NULL
       AND verified_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [userId]
  );

  return rows[0] ?? null;
};

export const findLatestResendablePasswordResetOtpByUserIdForUpdate = async (
  connection: PoolConnection,
  userId: number
): Promise<ResendablePasswordResetOtpRow | null> => {
  const [rows] = await connection.query<ResendablePasswordResetOtpRow[]>(
    `SELECT id, resend_count, created_at
     FROM password_reset_otps
     WHERE user_id = ?
       AND used_at IS NULL
       AND verified_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [userId]
  );

  return rows[0] ?? null;
};

export const expireUnusedPasswordResetOtpsByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET expires_at = NOW()
     WHERE user_id = ?
       AND verified_at IS NULL
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [userId]
  );
};

export const createPasswordResetOtp = async (
  connection: PoolConnection,
  params: CreatePasswordResetOtpParams
): Promise<number> => {
  await expireUnusedPasswordResetOtpsByUserId(connection, params.userId);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO password_reset_otps
      (user_id, otp_hash, expires_at, resend_count)
     VALUES (?, ?, ?, ?)`,
    [params.userId, params.otpHash, params.expiresAt, params.resendCount ?? 0]
  );

  return result.insertId;
};

export const incrementPasswordResetOtpAttemptCount = async (
  connection: PoolConnection,
  otpRequestId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET attempt_count = attempt_count + 1
     WHERE id = ?`,
    [otpRequestId]
  );
};

export const invalidatePasswordResetOtpById = async (
  connection: PoolConnection,
  otpRequestId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET expires_at = NOW()
     WHERE id = ?
       AND used_at IS NULL
       AND verified_at IS NULL`,
    [otpRequestId]
  );
};

export const markPasswordResetOtpVerified = async (
  connection: PoolConnection,
  otpRequestId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET verified_at = NOW()
     WHERE id = ?
       AND used_at IS NULL
       AND verified_at IS NULL
       AND expires_at > NOW()`,
    [otpRequestId]
  );
};

export const findVerifiedPasswordResetOtpByIdForUpdate = async (
  connection: PoolConnection,
  params: {
    otpRequestId: number;
    userId: number;
  }
): Promise<VerifiedPasswordResetOtpRow | null> => {
  const [rows] = await connection.query<VerifiedPasswordResetOtpRow[]>(
    `SELECT id, user_id
     FROM password_reset_otps
     WHERE id = ?
       AND user_id = ?
       AND verified_at IS NOT NULL
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1
     FOR UPDATE`,
    [params.otpRequestId, params.userId]
  );

  return rows[0] ?? null;
};

export const markPasswordResetOtpUsed = async (
  connection: PoolConnection,
  otpRequestId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET used_at = NOW()
     WHERE id = ?
       AND verified_at IS NOT NULL
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [otpRequestId]
  );
};

export const invalidateOtherOutstandingPasswordResetOtps = async (
  connection: PoolConnection,
  params: {
    userId: number;
    otpRequestId: number;
  }
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE password_reset_otps
     SET expires_at = NOW()
     WHERE user_id = ?
       AND id <> ?
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [params.userId, params.otpRequestId]
  );
};

export const revokeRefreshToken = async (
  connection: PoolConnection,
  refreshTokenId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE id = ?
       AND revoked_at IS NULL`,
    [refreshTokenId]
  );
};

export const revokeRefreshTokensByUserId = async (
  connection: PoolConnection,
  userId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = ?
       AND revoked_at IS NULL`,
    [userId]
  );
};

export const updateUserLastLoginAt = async (
  connection: PoolConnection,
  userId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [userId]
  );
};

export const updateUserPasswordHash = async (
  connection: PoolConnection,
  userId: number,
  passwordHash: string
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, userId]
  );
};

export const findSubscriptionPlanByCode = async (
  connection: PoolConnection,
  planCode: string
): Promise<PlanRow | null> => {
  const [rows] = await connection.query<PlanRow[]>(
    'SELECT id, plan_code FROM subscription_plans WHERE plan_code = ? LIMIT 1',
    [planCode]
  );

  return rows[0] ?? null;
};

export const createUserSubscription = async (
  connection: PoolConnection,
  userId: number,
  planId: number
): Promise<void> => {
  await connection.query<ResultSetHeader>(
    `INSERT INTO user_subscriptions
      (user_id, plan_id, subscription_status, start_date, end_date, auto_renew)
     VALUES (?, ?, ?, NOW(), NULL, ?)`,
    [userId, planId, 'ACTIVE', false]
  );
};
