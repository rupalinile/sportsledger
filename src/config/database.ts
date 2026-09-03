import mysql, {
  Pool,
  QueryResult
} from 'mysql2/promise';

import { env } from './env';

export const databasePool: Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,

  connectTimeout: 10000,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const query = async <T extends QueryResult>(
  sql: string,
  values?: unknown[]
): Promise<T> => {
  const [rows] = await databasePool.query<T>(
    sql,
    values
  );

  return rows;
};

export const verifyDatabaseConnection = async (): Promise<void> => {
  await query('SELECT 1');

  console.log(
    'SportsLedger database connected successfully'
  );
};