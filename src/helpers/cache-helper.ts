import _ from "lodash";
import fs from "fs";
import path from "path";
import { BalanceSnapshots, ClaimingSnapshots, Snapshot } from "../types";

const CACHE_PATH = "./cache";
const SNAPSHOTS_PATH = "./snapshots";

const join = (...snapshotPath: string[]) =>
  path.join(CACHE_PATH, ...snapshotPath);
const joinSnapshotPath = (...snapshotPath: string[]) =>
  path.join(SNAPSHOTS_PATH, ...snapshotPath);

const exists = fs.existsSync;

export const getFileFromBlockNumber = (blockNumber: number | string) =>
  `${blockNumber}.csv`;

export const isCached = (id: string, blockNumber: number) =>
  exists(join(id, getFileFromBlockNumber(blockNumber)));

// Events

export const getJson = (id: string, name: string) => {
  try {
    if (exists(CACHE_PATH)) {
      const jsonPath = join(id, name + ".json");
      return JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" }));
    }
  } catch (e) {
    return null;
  }
};

export const setJson = (id: string, name: string, data: string) => {
  if (exists(CACHE_PATH)) {
    const idPath = join(id);
    if (!exists(idPath)) {
      fs.mkdirSync(idPath);
    }
    const jsonPath = join(id, name + ".json");
    fs.writeFileSync(jsonPath, data);
  }
};

// Snapshots

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
  snapshots: BalanceSnapshots | ClaimingSnapshots,
  force?: boolean
) => {
  _.entries(snapshots).forEach(([blockNumber, snapshot]) => {
    // If snapshots directory exists
    if (exists(SNAPSHOTS_PATH)) {
      const idPath = joinSnapshotPath(id);
      if (!exists(idPath)) {
        fs.mkdirSync(idPath);
      }
      const blockPath = joinSnapshotPath(
        id,
        getFileFromBlockNumber(blockNumber)
      );
      if (!exists(blockPath) || force) {
        fs.writeFileSync(blockPath, snapshotToStr(snapshot));
      }
    }
  });
};

export const loadSnapshot = (id: string, name: string) => {
  if (exists(CACHE_PATH)) {
    const idPath = joinSnapshotPath(id);
    if (exists(idPath)) {
      const jsonPath = joinSnapshotPath(id, name + ".csv");
      const data = fs.readFileSync(jsonPath, { encoding: "utf-8" });
      // Split by new line and remove header
      const snapshot: Snapshot = data
        .split("\n")
        .slice(1)
        .reduce((prev, line) => {
          const next = {
            ...prev,
          };
          const [address, balanceStr] = line.split(",");
          const balance = Number(balanceStr);
          if (!isNaN(balance)) {
            next[address] = balance;
          }
          return next;
        }, {} as Snapshot);
      return snapshot;
    }
  }
};
