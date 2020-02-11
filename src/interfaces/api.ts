// TODO generate the interfaces with swagger

/**
 * Contains the size and the gzip size
 */
export interface Sizes {
  size: number;
  gzip: number;
}

export interface BundleWithSizes extends Sizes {
  packageName: string;
  version: string;
}

/**
 * Reply response of GET /package-sizes
 */
export interface BundleSizeReply {
  errors?: string[];
  warnings?: string[];
  data?: BundleWithSizes[];
}
