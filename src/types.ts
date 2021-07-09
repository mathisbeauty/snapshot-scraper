// Claiming

export type ClaimingSnapshot = { [address: string]: boolean };

export type ClaimingSnapshots = {
  [id: string]: ClaimingSnapshot;
};

export type ClaimingPeriod = {
  startBlock: number;
  endBlock?: number;
};

// Balances

export type Snapshot = { [address: string]: number };

export type BalanceSnapshots = {
  [id: string]: Snapshot;
};
