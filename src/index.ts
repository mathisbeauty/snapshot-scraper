import { setBalancesSnapshots } from "./helpers/cache-helper";
import { getStakersSnapshots } from "./stakers";

if (process.env.INFURA_PROJECT_URL === undefined) {
  console.error("Please define the URL for the Infura project");
  process.exit(1);
}

// 0 = latest
const STAKERS_BLOCK_NUMBERS: number[] = [0];

(async () => {
  const stakersBalanceSnapshots = await getStakersSnapshots(
    STAKERS_BLOCK_NUMBERS
  );

  console.log(stakersBalanceSnapshots);
})();
