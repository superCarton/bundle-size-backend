import { createEntryPoint, getExternalsDependencies, compilePackage } from "./build-package";
import { installPackage, clearPath, getInstallPath } from "./install-package";
import { gzipSync } from "zlib";
import { join } from "path";
import { readFileSync } from "fs";
import { Sizes } from '../interfaces';
import { logger } from "../app";

/**
 * Build the npm package and returns the webpack stats
 * @param packageName 
 * @param installPath 
 */
async function installAndBuildPackage(packageName: string, packageWithVersion: string, installPath: string, additionnalDependencies: string[] = []) {
  logger.debug(`installing [${packageWithVersion}]`);
  await installPackage(packageWithVersion, installPath);
  const entryPoint = createEntryPoint(packageName, installPath, true);
  if (!entryPoint) {
    throw "Entry point not created";
  }
  const entries = {main: entryPoint};
  const externals = getExternalsDependencies(packageName, installPath);
  logger.debug(`compiling [${packageWithVersion}]`);
  return compilePackage(
    entries, 
    {...externals, externalPackages: (externals.externalPackages ? externals.externalPackages : []).concat(additionnalDependencies)}, 
    installPath
  );
}

/**
 * Parse missing modules
 */
function parseMissingModules(errors: string[]): string[] {
  const missingModules = [];
  const missingModuleRegex = /Can't resolve '(.+)' in/;
  errors.forEach((err) => {
    const matches = err.match(missingModuleRegex);
    const missingFilePath = matches[1];
    let mModule;
    if (missingFilePath.startsWith('@')) {
      mModule = missingFilePath.match(/@[^\/]+\/[^\/]+/)[0];
    } else {
      mModule = missingFilePath.match(/[^\/]+/)[0];
    }
    if (mModule) {
      missingModules.push(mModule);
    }
  });
  return missingModules;
}

/**
 * Compute webpack stats to and calculate the bunle size
 */
function computeStatsFromWebpackOutput(webpackStats: any, installFolder: string, packageWithVersion: string): {sizes?: Sizes, missingModules?: string[]} | undefined {
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

  if (jsonStats.errors && jsonStats.errors.length) {
    const missingModules = parseMissingModules(jsonStats.errors);
    if (missingModules.length > 0) {
      return {missingModules};
    }
  }

  logger.debug(`Stats for ${packageWithVersion}: ${JSON.stringify(jsonStats)}`);

  if (jsonStats.errors && jsonStats.errors.length > 1 && !jsonStats.assets) {
    logger.error(`Failed compiling ${packageWithVersion}`);
    return undefined;
  }

  const filteredStats: Sizes[] = jsonStats.assets
    .filter((asset) => !asset.chunkNames.includes('runtime'))
    .filter((asset) => !asset.name.includes('LICENSE'))
    .map((asset) => getSingleAssetStats(installFolder, asset));

  if (filteredStats.length > 0) {
    logger.debug(`calculating stats of ${filteredStats.length} bundles in ${installFolder}`);
    return {sizes: filteredStats.reduce((acc, stat) => ({size: acc.size + stat.size, gzip: acc.gzip + stat.gzip}), {size: 0, gzip: 0})};
  } else {
    logger.error(`there is no assets to get stats from ${installFolder}`);
  }
}

/**
 * Computes bundle size then gzip
 * @param installPath 
 * @param asset 
 */
function getSingleAssetStats(installPath: string, asset): Sizes {
  const bundle = join(installPath, 'dist', asset.name);
  const bundleContents = readFileSync(bundle);
  const gzip = gzipSync(bundleContents, {}).length
  return {
    size: asset.size,
    gzip
  }
}

/**
 * Computes the bundle size of a package by creating a blank application with a single dependency. The application is then compiled with webpack.
 */
export async function computeBundleSize(packageName: string, packageWithVersion: string, additionnalDependencies?: string[]): Promise<Sizes | undefined> {
  const installFolder = getInstallPath(packageWithVersion);
  try {
    const compilationResult: {err?: any, stats?: any} = await installAndBuildPackage(packageName, packageWithVersion, installFolder, additionnalDependencies);
    if (compilationResult.err) {
      logger.error(`error during [${packageWithVersion}] compilation: ${compilationResult.err}`);
      throw `Error during [${packageWithVersion}] compilation`;
    }
    const stats = computeStatsFromWebpackOutput(compilationResult, installFolder, packageWithVersion);
    if (stats.missingModules) {
      logger.debug(`missing modules ${stats.missingModules} have been found compiling ${packageWithVersion}`);
      await clearPath(installFolder);
      return computeBundleSize(packageName, packageWithVersion, stats.missingModules);
    } else {
      logger.debug(`Stats for [${packageName}]: ${JSON.stringify(stats)}`);
      return stats.sizes;
    }
  } catch(e) { 
    logger.error(`error during [${packageWithVersion}] compilation: ${e}`);
  }
  finally {
    logger.debug(`clearing ${installFolder} path`);
    await clearPath(installFolder);
  }
}
