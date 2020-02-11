// TODO generate the interfaces with swagger

/**
 * Size stats of a single file
 */
export interface FileStat {
  name: string;
  type: string;
  size: number;
  gzip: number;
}

export interface Sizes {
  size: number;
  gzip: number;
}

export interface BundleWithSizes extends Sizes {
  packageName: string;
  version: string;
}

export interface Cache {
  [packageName: string]: BundleWithSizes;
}
