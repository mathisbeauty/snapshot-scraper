export type Snapshot = { [address: string]: number };

export type BalanceSnapshots = {
  [id: string]: Snapshot;
};
