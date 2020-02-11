import {join} from 'path';
import {writeFileSync} from 'fs';
import {execPromise, TMP_FOLDER} from '../utils';

export function getInstallPath(packageNameWithVersion: string) {
  return join(TMP_FOLDER, 'packages', `${packageNameWithVersion}`);
}

/**
 * Create the path the the tmp directory
 * @param installPath 
 */
async function preparePath(installPath: string) {
  await execPromise(`mkdir -p ${installPath}`);
  writeFileSync(join(installPath, 'package.json'), JSON.stringify({ dependencies: {} }));
}

/**
 * Install the desired package in the tmp directory
 * @param packageNameWithVersion 
 * 
 * @param installPath 
 */
export async function installPackage(packageNameWithVersion: string, installPath: string) {
  await preparePath(installPath);
  const npmFlags = [
    // Setting cache is required for concurrent `npm install`s to work
    `cache=${join(TMP_FOLDER, 'cache')}`,
    'no-package-lock',
    'no-shrinkwrap',
    'no-optional',
    'no-bin-links',
    'prefer-offline',
    'progress false',
    'loglevel error',
    'ignore-scripts',
    'save-exact',
    'production',
    'json',
  ];
  return execPromise(`npm install ${packageNameWithVersion} --${npmFlags.join(' --')}`, {cwd: installPath, maxBuffer: 1024 * 500});
}

/**
 * Clear installation folder
 * @param installFolder 
 */
export function clearPath(installFolder: string) {
  return execPromise(`rm -rf ${installFolder}`);
}
