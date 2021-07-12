// Staking

import { ClaimingPeriod } from "./types";

// export const AGIX_STAKE_REWARD_PER_PERIOD = 10000000000000;

export const AGI_MIN_STAKE = 50000000000;

export const AGI_STAKE_STARTING_BLOCK = 9797090;
export const AGIX_STAKE_STARTING_BLOCK = 9797090;

export const AGI_STAKE_PERIODS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];
export const AGIX_STAKE_PERIODS: number[] = [15];

// Holders

/**
 * Spreads the block number of a specific snapshot by the amount of blocks specified (backwards or forwards randomly)
 */
export const AGI_AGIX_SNAPSHOT_RANDOM_SPREAD = 0

// AGI

export const AGI_SNAPSHOT_INTERVAL = 43200;

export const AGI_FIRST_BLOCK = 4767997;

export const AGI_FIRST_SNAPSHOT_BLOCK = 12260705;

/**
 * Block of the AGIX hardfork
 */
export const AGI_LAST_BLOCK = 12524809;

// AGIX

export const AGIX_SNAPSHOT_INTERVAL = 43200;

export const AGIX_FIRST_BLOCK = 12326815;

export const AGIX_FIRST_SNAPSHOT_BLOCK = 12663325;

export const AGIX_SCRAPING_STEP_SIZE = 100;

// LP

export const LP_STARTING_BLOCK = 12561147;

export const LP_SNAPSHOT_BLOCKS: number[] = [
  // Block at Jun-18-2021 11:58:28 PM +UTC
  12661467,
  // Block at Jul-07-2021 01:22:54 PM +UTC
  12780535,
];

// Claiming

export const CLAIMING_PERIODS: ClaimingPeriod[] = [
  {
    startBlock: 12471031,
    endBlock: 12683389,
  },
  // {
  //   startBlock: 12683389
  // }
];
