import { execPromise, filterDuplicateFromList } from "../utils";
import { major, satisfies } from 'semver';
import { logger } from "../app";

/**
 * Get the versions to download: 3 lasts and previous major
 * @param packageName 
 */
export async function getVersionsToDownload(packageName: string): Promise<string[]> {
  try {
    const {stdout, stderr} = await execPromise(`npm show ${packageName} versions`);
    if (!stderr) {
      try {
        const versionsList = JSON.parse(stdout.replace(/'/g, '"')) as string[];
        const currentVersion = versionsList[versionsList.length-1]
        const lastVersions = versionsList.slice(-3, -1);
        const currentMajor = major(currentVersion);
        const previousMajor = versionsList.reverse().find((version) => satisfies(version, `${currentMajor-1}.x`));
        const versionsToFetch = [currentVersion].concat(lastVersions);
        if (previousMajor) {
          versionsToFetch.push(previousMajor);
        }
        return filterDuplicateFromList(versionsToFetch);
      } catch (e) {
        logger.error(`[${packageName}] error when parsing the versions to fetch`);
      }
    }
  } catch (e) {
    logger.error(`[${packageName}] is not an existing NPM package`);
  }
  return [];
}
