import { createEntryPoint, getExternalsDependencies, compilePackage } from "./build-package";
import { installPackage, clearPath, getInstallPath } from "./install-package";
import { gzipSync } from "zlib";
import { join } from "path";
import { readFileSync } from "fs";
import { FileStat, Sizes } from '../interfaces';
import { logger } from "../app";

/**
 * Build the npm package and returns the webpack stats
 * @param packageName 
 * @param installPath 
 */
async function installAndBuildPackage(packageName: string, packageWithVersion: string, installPath: string) {
  logger.debug(`installing [${packageWithVersion}]`);
  await installPackage(packageWithVersion, installPath);
  const entryPoint = createEntryPoint(packageName, installPath, true);
  if (!entryPoint) {
    throw "Entry point not created";
  }
  const entries = {main: entryPoint};
  const externals = getExternalsDependencies(packageName, installPath);
  logger.debug(`compiling [${packageWithVersion}]`);
  return compilePackage(entries, externals, installPath);
}

/**
 * Compute webpack stats to and calculate the bunle size
 */
function computeStatsFromWebpackOutput(webpackStats: any, installFolder: string, packageWithVersion: string): Sizes | undefined {
  logger.debug(`computing stats from ${installFolder}`);
  const jsonStats = webpackStats.stats
    ? webpackStats.stats.toJson({
        assets: true,
        children: false,
        chunks: false,
        chunkGroups: false,
        chunkModules: false,
        chunkOrigins: false,
        modules: true,
        errorDetails: false,
        entrypoints: false,
        reasons: false,
        maxModules: 500,
        performance: false,
        source: true,
        depth: true,
        providedExports: true,
        warnings: false,
        modulesSort: 'depth',
      })
    : {};

  logger.debug(`Stats for ${packageWithVersion}: ${JSON.stringify(jsonStats)}`);

  if (jsonStats.errors && jsonStats.errors.length > 1) {
    logger.error(`Failed compiling ${packageWithVersion}`);
    return undefined;
  }

  const filteredStats: FileStat[] = jsonStats.assets
    .filter((asset) => !asset.chunkNames.includes('runtime'))
    .filter((asset) => !asset.name.includes('LICENSE'))
    .map((asset) => getSingleAssetStats(installFolder, asset));

  if (filteredStats.length > 0) {
    logger.debug(`calculating stats of ${filteredStats.length} bundles in ${installFolder}`);
    return filteredStats.reduce((acc, stat) => ({size: acc.size + stat.size, gzip: acc.gzip + stat.gzip}), {size: 0, gzip: 0});
  } else {
    logger.error(`there is no assets to get stats from ${installFolder}`);
  }
}

/**
 * Computes bundle size then gzip
 * @param installPath 
 * @param asset 
 */
function getSingleAssetStats(installPath: string, asset): FileStat {

  const bundle = join(installPath, 'dist', asset.name);
  const bundleContents = readFileSync(bundle);
  const gzip = gzipSync(bundleContents, {}).length
  const [_, entryName, extension] = asset.name.match(/(.+?)\.bundle\.(.+)$/);

  return {
    name: entryName,
    type: extension,
    size: asset.size,
    gzip
  }
}

/**
 * Computes the bundle size of a package by creating a blank application with a single dependency. The application is then compiled with webpack.
 * @param packageName 
 * @param packageWithVersion 
 */
export async function computeBundleSize(packageName: string, packageWithVersion: string): Promise<Sizes | undefined> {
  const installFolder = getInstallPath(packageWithVersion);
  let stats;
  try {
    const compilationResult: {err?: any, stats?: any} = await installAndBuildPackage(packageName, packageWithVersion, installFolder);
    if (compilationResult.err) {
      logger.error(`error during [${packageWithVersion}] compilation: ${compilationResult.err}`);
      throw `Error during [${packageWithVersion}] compilation`;
    }
    stats = computeStatsFromWebpackOutput(compilationResult, installFolder, packageWithVersion);
    logger.debug(`Stats for [${packageName}]: ${JSON.stringify(stats)}`);
    return stats;
  } catch(e) { 
    logger.error(`error during [${packageWithVersion}] compilation: ${e}`);
  }
  finally {
    logger.debug(`clearing ${installFolder} path`);
    await clearPath(installFolder);
  }
}
