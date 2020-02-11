import * as express from "express";
import { getPackageId } from './utils';
import { computeBundleSize } from './compute-package-size';
import { Cache, BundleWithSizes, BundleSizeReply } from './interfaces';
import { createLogger , transports } from 'winston';
import { getVersionsToDownload } from './list-npm-versions';

const app = express();
const port = 8080;
export const logger = createLogger({
  transports: [new transports.Console({level: 'info'}), new transports.File({filename: 'serverlogs.log', level: 'debug'})]
});

/**
 * Simple cash object keeping the packages sizes when they zere qlreqdy computed
 */
const cache: Cache = {};

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  //intercepts OPTIONS method
  if ('OPTIONS' === req.method) {
    //respond with 200
    res.send(200);
  }
  else {
  //move on
    next();
  }
});

app.get("/package-sizes", async (req, res) => {

  const packageName = req.query.package && decodeURIComponent(req.query.package);
  if (!packageName) {
    // TODO handle validation with swagger express
    res.status(400).json({error: 'package query parameter is missing'});
    logger.info(`request received missing package parameter`);
  }
  logger.debug(`request received for [${packageName}]`);
  const versions = await getVersionsToDownload(packageName);
  logger.debug(`versions to return for [${packageName}] - ${versions}`);

  if (versions.length > 0) {
    const promises = versions.map((version) => getBundleSize(packageName, version));
    const bundleSizes = (await Promise.all(promises)).filter((size) => !!size);
    const errorOnCalculationBundles = bundleSizes.filter((bSize) => !bSize.gzip || !bSize.size);
    const validBundles = bundleSizes.filter((bSize) => bSize.gzip && bSize.size);
    if (validBundles.length > 0) {
      logger.debug(`bundle sizes returned for [${packageName}] - ${bundleSizes}`);
      if (errorOnCalculationBundles.length) {
        logger.warn(`${errorOnCalculationBundles.length} errors for [${packageName}]`);
      }
      res.status(200).json({
        data: validBundles,
        warnings: errorOnCalculationBundles.length > 0 ? errorOnCalculationBundles.map((bSize) => `Error during ${getPackageId(bSize.packageName, bSize.version)} bundle size computation`) : undefined 
      } as BundleSizeReply); 
    } else {
      logger.error(`no bundle size returned for [${packageName}]`);
      res.status(500).json({errors: [`[${packageName}] Error during bundle size calculation`]} as BundleSizeReply);
    }
  } else {
    logger.info(`package does not exist for [${packageName}]`);
    res.status(404).json({errors: [`[${packageName}] Package not found`]} as BundleSizeReply);
  }
});

// start the express server
app.listen((port), () => {
  logger.info(`server started at http://localhost:${port}`);
});

/**
 * @param packageName 
 * @param version 
 */
export async function getBundleSize(packageName: string, version: string): Promise<Partial<BundleWithSizes>> {
  try {
    const packageId = getPackageId(packageName, version);
    if (!cache[packageId]) {
      logger.debug(`${packageId} not cached, need to compute size`);
      const bundleSizes = await computeBundleSize(packageName, packageId);
      if (bundleSizes) {
        cache[packageId] = {packageName, version, size: bundleSizes.size, gzip: bundleSizes.gzip};
        return cache[packageId];
      }
    } else {
      logger.debug(`Get ${packageId} from cache`);
    }
  } catch (e) {
    logger.error(`error in getBundleSize for [${getPackageId(packageName, version)}]`);
  }
  return {packageName, version};
}
