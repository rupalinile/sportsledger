import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type AppVersionRow = RowDataPacket & {
  id: number;
  platform: string;
  latest_version: string;
  force_update: number | boolean;
  download_url: string | null;
  release_notes: string | null;
};

export const findLatestActiveAppVersionByPlatform = async (
  connection: PoolConnection,
  platform: string
): Promise<AppVersionRow | null> => {
  const [rows] = await connection.query<AppVersionRow[]>(
    `SELECT id, platform, latest_version, force_update, download_url, release_notes
      FROM app_versions
      WHERE platform = ?
        AND is_active = 1
      ORDER BY id DESC
      LIMIT 1`,
    [platform]
  );

  return rows[0] ?? null;
};
