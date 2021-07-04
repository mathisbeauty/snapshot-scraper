export type Snapshot = { [address: string]: number };

export type BalanceSnapshots = {
  [block: number]: Snapshot;
};
