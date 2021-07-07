import lpAbiJson from "../../contracts/abi/lp-agix-eth.json";
import { AGIX_ETH_PAIR_CONTRACT_ADDRESS } from "../constants";
import Web3 from "web3";
import { LP_STARTING_BLOCK } from "../parameters";
import { getJson, setJson } from "../helpers/cache-helper";
import { BalanceSnapshots } from "../types";

export const getLpSnapshots = async (web3: Web3, blockNumbers: number[]) => {
  const balanceSnapshots: BalanceSnapshots = {};

  const contract = new web3.eth.Contract(
    lpAbiJson as any,
    AGIX_ETH_PAIR_CONTRACT_ADDRESS
  );

  const cachedEvents = getJson("agix_lp", "events");
  let events = cachedEvents;

  if (!cachedEvents) {
    events = {
      mintEvents: await contract.getPastEvents("Mint", {
        fromBlock: LP_STARTING_BLOCK,
      }),
    };
    setJson("agi_lp", "events", JSON.stringify(events, null, 4));
  }

  console.log();
};
