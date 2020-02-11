import { createEntryPoint, getExternalsDependencies, compilePackage } from "./build-package";
import { installPackage, clearPath, getInstallPath } from "./install-package";
import { gzipSync } from "zlib";
import { join } from "path";
import { readFileSync } from "fs";
import { FileStat, Sizes } from '../interfaces';

/**
 * Build the npm package and returns the webpack stats
 * @param packageName 
 * @param installPath 
 */
async function installAndBuildPackage(packageName: string, packageWithVersion: string, installPath: string) {
  console.log('installing', packageWithVersion);
  await installPackage(packageWithVersion, installPath);
  const entries = {main: createEntryPoint(packageName, installPath, true)};
  const externals = getExternalsDependencies(packageName, installPath);
  console.log('compiling', packageWithVersion);
  return compilePackage(entries, externals, installPath);
}

/**
 * Compute webpack stats to and calculate the bunle size
 * @param webpackStats 
 * @param installFolder 
 */
function computeStats(webpackStats: any, installFolder: string): Sizes | undefined {
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

  const allStats: FileStat[] = jsonStats.assets
    .filter((asset) => !asset.chunkNames.includes('runtime'))
    .filter((asset) => !asset.name.includes('LICENSE'))
    .map((asset) => getSingleAssetStats(installFolder, asset));

  if (allStats.length > 0) {
    return allStats.reduce((acc, stat) => ({size: acc.size + stat.size, gzip: acc.gzip + stat.gzip}), {size: 0, gzip: 0});
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
    const compilationResult = await installAndBuildPackage(packageName, packageWithVersion, installFolder);
    stats = await computeStats(compilationResult, installFolder);
  } catch(e) { console.log(e);}
  finally {
    await clearPath(installFolder);
  }
  return stats;
}
