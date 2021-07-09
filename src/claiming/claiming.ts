import Web3 from "web3";
import { AIRDROP_CLAIMING_ADDRESS } from "../constants";
import { ClaimingPeriod, ClaimingSnapshots } from "../types";

export const getClaimingSnapshots = async (
  web3: Web3,
  claimingPeriods: ClaimingPeriod[]
) => {
  const claimingSnapshots: ClaimingSnapshots = {};

  const contract = new web3.eth.Contract([], AIRDROP_CLAIMING_ADDRESS);

  const allEvents = await contract.events.allEvents({
    fromBlock: claimingPeriods[0].startBlock,
  });

  console.log(allEvents);

  return claimingSnapshots;
};
