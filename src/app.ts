import * as express from "express";
import { getVersionsToDownload, getPackageId } from './utils';
import { computeBundleSize } from './compute-package-size';
import { Cache, BundleWithSizes } from './interfaces';

const app = express();
const port = 8080;

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

app.get("/", async (req, res) => {

  const packageName = req.query.package || '';
  const versions = await getVersionsToDownload(packageName);

  if (versions.length > 0) {
    const promises = versions.map((version) => getBundleSize(packageName, version.tag));
    const bundleSizes = (await Promise.all(promises)).filter((size) => !!size);
    if (bundleSizes.length > 0) {
      res.status(200).json({data: bundleSizes}); 
    } else {
      res.status(400).json({error: `[${packageName}] Error during bundle size calculation`});
    }
  } else {
    res.status(404).json({error: `[${packageName}] Package not found`});
  }
});

// start the express server
app.listen((port), () => {
  // tslint:disable-next-line:no-console
  console.log( `server started at http://localhost:${port}`);
});

/**
 * @param packageName 
 * @param version 
 */
export async function getBundleSize(packageName: string, version: string): Promise<BundleWithSizes | undefined> {
  try {
    const packageId = getPackageId(packageName, version);
    if (!cache[packageId]) {
      const bundleSizes = await computeBundleSize(packageName, packageId);
      if (bundleSizes) {
        cache[packageId] = {packageName, version, size: bundleSizes.size, gzip: bundleSizes.gzip};
      }
    }
    return cache[packageId];
  } catch (e) {
    console.log('error in getBundleSize', e);
  }
}



