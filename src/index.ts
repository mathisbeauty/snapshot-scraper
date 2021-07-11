import Web3 from "web3";
import { getClaimingSnapshots } from "./claiming/claiming";
import { setBalancesSnapshots } from "./helpers/cache-helper";
import { getAgiHoldersSnapshots } from "./holders/agi";
import { getAgixHoldersSnapshots } from "./holders/agix";
import { getLpSnapshots } from "./lp/lp";
import {
  AGIX_STAKE_PERIODS,
  AGI_STAKE_PERIODS,
  CLAIMING_PERIODS,
  LP_SNAPSHOT_BLOCKS,
} from "./parameters";
import { getAgiStakeSnapshots } from "./stakers/agi";
import { getAgixStakeSnapshots } from "./stakers/agix";

if (process.env.WEB3_PROVIDER_URL === undefined) {
  console.error("Please define the URL for the Web3 provider");
  process.exit(1);
}

(async () => {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER_URL as string)
  );

  // const agiStakeSnapshots = await getAgiStakeSnapshots(web3, AGI_STAKE_PERIODS);

  // setBalancesSnapshots("agi_stake", agiStakeSnapshots, true);

  // const agixStakeSnapshots = await getAgixStakeSnapshots(
  //   web3,
  //   AGIX_STAKE_PERIODS
  // );

  // setBalancesSnapshots("agix_stake", agixStakeSnapshots, true);

  // const agixLpSnapshots = await getLpSnapshots(web3, LP_SNAPSHOT_BLOCKS);

  // setBalancesSnapshots("agix_lp", agixLpSnapshots, true);

  // const agiHolderSnapshots = await getAgiHoldersSnapshots(web3);

  // setBalancesSnapshots("agi_holders", agiHolderSnapshots, true);

  const agixHolderSnapshots = await getAgixHoldersSnapshots(web3);

  setBalancesSnapshots("agix_holders", agixHolderSnapshots, true);

  // const claimingSnapshots = await getClaimingSnapshots(web3, CLAIMING_PERIODS);

  // setBalancesSnapshots("claiming", claimingSnapshots, true);
})();
