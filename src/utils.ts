import {exec} from 'child_process';
import {promisify} from'util';

export const TMP_FOLDER = './TMP_MODULES';
export const execPromise = promisify(exec);

/**
 * Get package id
 * @param packageName 
 * @param version 
 */
export function getPackageId(packageName: string, version: string) {
  return `${packageName}@${version}`;
}

/**
 * Filter duplicated elements from an array of strings
 * @param list 
 */
export function filterDuplicateFromList(list: string[]) {
  return list.filter((elem, index) => list.indexOf(elem) === index);
}
