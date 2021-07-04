import _ from "lodash";
import fs from "fs";
import path from "path";
import { BalanceSnapshots, Snapshot } from "../types";

const CACHE_PATH = "./cache";

const join = (...snapshotPath: string[]) =>
  path.join(CACHE_PATH, ...snapshotPath);

const exists = fs.existsSync;

export const getFileFromBlockNumber = (blockNumber: number | string) =>
  `${blockNumber}.csv`;

export const isCached = (id: string, blockNumber: number) =>
  exists(join(id, getFileFromBlockNumber(blockNumber)));

export const snapshotToStr = (snapshot: Snapshot) => {
  return _.reduce(
    _.entries(snapshot),
    (prev, curr) => {
      return prev + `${curr[0]},${curr[1]}\n`;
    },
    "address,balance\n"
  );
};

export const setBalancesSnapshots = (
  id: string,
  snapshots: BalanceSnapshots
) => {
  _.entries(snapshots).forEach(([blockNumber, snapshot]) => {
    // If cache directory exists
    if (exists(CACHE_PATH)) {
      const idPath = join(id);
      if (!exists(idPath)) {
        fs.mkdirSync(idPath);
      }
      const blockPath = join(id, getFileFromBlockNumber(blockNumber));
      if (!exists(blockPath)) {
        fs.writeFileSync(blockPath, snapshotToStr(snapshot));
      }
    }
  });
};
