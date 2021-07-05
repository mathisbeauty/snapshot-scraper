import { setBalancesSnapshots } from "./helpers/cache-helper";
import { getLpSnapshots } from "./lp/lp";
import { getStakers } from "./stakers/agi";
// import { getStakers, getStakeInfo, getStakersSnapshots } from "./stakers/agi";
// import { getStakersSnapshots } from "./stakers/agix";

if (process.env.INFURA_PROJECT_URL === undefined) {
  console.error("Please define the URL for the Infura project");
  process.exit(1);
}

// 0 = latest
const STAKERS_BLOCK_NUMBERS: number[] = [0];

(async () => {
  console.log(await getStakers());
  // console.log(await getLpSnapshots());
  // const stakersBalanceSnapshots = await getStakersSnapshots(15);

  // console.log(stakersBalanceSnapshots);

  // setBalancesSnapshots("agix_stake", stakersBalanceSnapshots);

  // const stakingPeriodIndexes = [13, 14];

  // setBalancesSnapshots(
  //   "agi_stake",
  //   await getStakersSnapshots(stakingPeriodIndexes)
  // );

  console.log();
})();
