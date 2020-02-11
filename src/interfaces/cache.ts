import { BundleWithSizes } from "./api";

export interface Cache {
  [packageName: string]: BundleWithSizes;
}
