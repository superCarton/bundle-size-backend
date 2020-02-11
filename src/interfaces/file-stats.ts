/**
 * Size stats of a single file
 */
export interface FileStat {
  name: string;
  type: string;
  size: number;
  gzip: number;
}
