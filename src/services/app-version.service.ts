import semver from 'semver';
import { databasePool } from '../config/database';
import {
  AppVersionRow,
  findLatestActiveAppVersionByPlatform
} from '../repositories/app-version.repository';

export type AppVersionCheckInput = {
  currentVersion: string;
  platform: string;
};

export type AppVersionCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  forceUpdate: boolean;
  downloadUrl: string | null;
  releaseNotes: string | null;
};

const hasUpdateAvailable = (
  currentVersion: string,
  latestVersion: string
): boolean => {
  const normalizedCurrentVersion = semver.valid(currentVersion);
  const normalizedLatestVersion = semver.valid(latestVersion);

  if (!normalizedCurrentVersion || !normalizedLatestVersion) {
    return false;
  }

  return semver.gt(normalizedLatestVersion, normalizedCurrentVersion);
};

const mapVersionCheckResult = (
  currentVersion: string,
  appVersion: AppVersionRow | null
): AppVersionCheckResult => {
  if (!appVersion) {
    return {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      forceUpdate: false,
      downloadUrl: null,
      releaseNotes: null
    };
  }

  return {
    currentVersion,
    latestVersion: appVersion.latest_version,
    updateAvailable: hasUpdateAvailable(currentVersion, appVersion.latest_version),
    forceUpdate: Boolean(appVersion.force_update),
    downloadUrl: appVersion.download_url,
    releaseNotes: appVersion.release_notes
  };
};

export const checkAppVersion = async (
  input: AppVersionCheckInput
): Promise<AppVersionCheckResult> => {
  const connection = await databasePool.getConnection();

  try {
    const appVersion = await findLatestActiveAppVersionByPlatform(
      connection,
      input.platform
    );

    return mapVersionCheckResult(input.currentVersion, appVersion);
  } finally {
    connection.release();
  }
};
