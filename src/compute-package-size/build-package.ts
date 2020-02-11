import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import * as webpack from 'webpack';
import { makeWebpackConfig } from './config';
import { resolve } from 'path';
import * as builtInModules from 'builtin-modules';
import { logger } from '../app';

/**
 * Create an entry points importing the desired library. 
 * @param packageName 
 * @param installPath 
 * @param isEsModule 
 */
export function createEntryPoint(packageName: string, installPath: string, isEsModule: boolean = true): string | undefined {
  try {
    const entryPath = join(installPath, 'index.js');
    let importStatement = isEsModule ? `import * as p from '${packageName}'; console.log(p);` : `const p = require('${packageName}'); console.log(p);`;
    logger.debug(`creating entry point [${entryPath}]`);
    writeFileSync(entryPath, importStatement, 'utf-8');
    return resolve(entryPath);
  } catch (e) {
    logger.error(`Error during entry point creation in ${installPath}`);
  }
}

/**
 * Build the package using the webpack configuration
 * @param entry 
 * @param externals 
 * @param installPath 
 */
export function compilePackage(entry, externals, installPath) {
  const webpackConfig = makeWebpackConfig(entry, externals, installPath);
  const compiler = webpack(webpackConfig);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      resolve({ stats, err });
    })
  })
}

/**
 * Gets external peerDeps that shouldn't be a
 * part of the build in a regex format -
 * /(^dep-a$|^dep-a\/|^dep-b$|^dep-b\/)\//
 */
export function getExternalsDependencies(packageName, installPath) {
  const packageJSONPath = join(
    installPath,
    'node_modules',
    packageName,
    'package.json'
  );
  const packageJSON = JSON.parse(readFileSync(packageJSONPath).toString());
  const dependencies = Object.keys(packageJSON.dependencies || {})
  const peerDependencies = Object.keys(packageJSON.peerDependencies || {})

  // All packages with name same as a built-in node module, but
  // haven't explicitly been added as an npm dependency are externals
  const builtInExternals = builtInModules.filter(mod => !dependencies.includes(mod))
  return {
    externalPackages: peerDependencies,
    externalBuiltIns: builtInExternals
  }
}
