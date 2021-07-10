import _ from "lodash";
import Web3 from "web3";
import agiAbiJson from "../../contracts/abi/holders-agi.json";
import { AGI_TOKEN_CONTRACT_ADDRESS } from "../constants";
import { getJson, setJson } from "../helpers/cache-helper";
import {
  AGI_FIRST_BLOCK,
  AGI_FIRST_SNAPSHOT_BLOCK,
  AGI_LAST_BLOCK,
  AGI_SNAPSHOT_INTERVAL,
} from "../parameters";
import { BalanceSnapshots } from "../types";

export const getAgiHoldersSnapshots = async (web3: Web3) => {
  const balanceSnapshots: BalanceSnapshots = {};

  const snapshotBlocks = [AGI_FIRST_SNAPSHOT_BLOCK];

  let nextSnapshotBlock = AGI_FIRST_SNAPSHOT_BLOCK;
  do {
    nextSnapshotBlock += AGI_SNAPSHOT_INTERVAL;
    if (nextSnapshotBlock < AGI_LAST_BLOCK) {
      snapshotBlocks.push(nextSnapshotBlock);
    }
  } while (nextSnapshotBlock < AGI_LAST_BLOCK);

  snapshotBlocks.push(AGI_LAST_BLOCK);

  const contract = new web3.eth.Contract(
    agiAbiJson as any,
    AGI_TOKEN_CONTRACT_ADDRESS
  );

  const cachedEvents = getJson("agi_holders", "events");

  let events = cachedEvents;

  if (!cachedEvents) {
    events = [];
    const stepSize = 4000;

    const totalBlocks = AGI_LAST_BLOCK - AGI_FIRST_BLOCK;

    const totalSteps = Math.ceil(totalBlocks / stepSize);

    for (let i = 0; i <= totalSteps; i++) {
      console.log(`Step ${i} of ${totalSteps}`);
      const offset = i * stepSize;
      const offsetLast = (i + 1) * stepSize;
      const fromBlock = AGI_FIRST_BLOCK + offset;
      let toBlock = AGI_FIRST_BLOCK + offsetLast - 1;
      if (toBlock > AGI_LAST_BLOCK) {
        toBlock = AGI_LAST_BLOCK;
      }
      const response = await contract.getPastEvents("Transfer", {
        fromBlock,
        toBlock,
      });
      console.log(`Requested from block ${fromBlock} to ${toBlock}`);
      if (response.length > 0) {
        events.push(...response);
        setJson(
          "agi_holders",
          `${i}--${fromBlock}-${toBlock}`,
          JSON.stringify(response, null, 4)
        );
      }
    }
    setJson("agi_holders", "events", JSON.stringify(events, null, 4));
  }

  return balanceSnapshots;
};
