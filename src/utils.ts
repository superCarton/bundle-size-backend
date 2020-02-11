import {exec} from 'child_process';
import {promisify} from'util';
import {major, satisfies} from 'semver';

export const TMP_FOLDER = './TMP_MODULES';
export const execPromise = promisify(exec);

export interface Version {
  tag: string;
  isCurrent?: boolean;
}

function getVersion(tag: string, isCurrent: boolean = false): Version {
  return {tag, isCurrent};
} 

/**
 * Get the versions to download: 3 lasts and previous major
 * @param packageName 
 */
export async function getVersionsToDownload(packageName: string): Promise<Version[]> {
  try {
    const {stdout, stderr} = await execPromise(`npm show ${packageName} versions`);
    if (!stderr) {
      try {
        const versionsList = JSON.parse(stdout.replace(/'/g, '"')) as string[];
        const currentVersion = versionsList[versionsList.length-1]
        const lastVersions = versionsList.slice(-3, -1);
        const currentMajor = major(currentVersion);
        const previousMajor = versionsList.reverse().find((version) => satisfies(version, `${currentMajor-1}.x`));
        let versionsToFetch: Version[] = [];
        versionsToFetch.push(getVersion(currentVersion, true));
        versionsToFetch = versionsToFetch.concat(lastVersions.map((l) => getVersion(l)));
        if (previousMajor) {
          versionsToFetch.push(getVersion(previousMajor));
        }
        return versionsToFetch;
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {
    console.log(packageName, 'is not an existing NPM package');
  }
  return [];
}

/**
 * Get package id
 * @param packageName 
 * @param version 
 */
export function getPackageId(packageName: string, version: string) {
  return `${packageName}@${version}`;
}
