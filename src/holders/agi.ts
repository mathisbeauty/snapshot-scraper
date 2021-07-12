import _ from "lodash";
import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import agiAbiJson from "../../contracts/abi/holders-agi.json";
import {
  AGI_TOKEN_CONTRACT_ADDRESS,
  AGI_TOKEN_CONTRACT_DEPLOYER,
  AGI_TOTAL_SUPPLY,
} from "../constants";
import { getJson, setJson } from "../helpers/cache-helper";
import {
  AGI_FIRST_BLOCK,
  AGI_FIRST_SNAPSHOT_BLOCK,
  AGI_LAST_BLOCK,
  AGI_SNAPSHOT_INTERVAL,
} from "../parameters";
import { BalanceSnapshots, Snapshot } from "../types";

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
        // setJson(
        //   "agi_holders",
        //   `${i}--${fromBlock}-${toBlock}`,
        //   JSON.stringify(response, null, 4)
        // );
      }
    }
    setJson("agi_holders", "events", JSON.stringify(events, null, 4));
  }

  // Set deployed state
  const blockchainState: { [address: string]: number } = {};
  blockchainState[AGI_TOKEN_CONTRACT_DEPLOYER] = AGI_TOTAL_SUPPLY;

  // Get a copy of the desired blocks
  const snapshotsMissing: number[] = snapshotBlocks.slice();

  for (const contractEvent of events) {
    // No more snapshots to take, break out of the loop
    if (snapshotsMissing.length === 0) {
      break;
    }

    // Use transaction to sender map
    const blockNumber = contractEvent.blockNumber;
    const { from, to, value: _value } = contractEvent.returnValues;
    const value = Number(_value);

    // Step 3

    // See if a desired block was already passed
    if (snapshotsMissing[0] < blockNumber) {
      // Remove first snapshot number
      const blockSnapshotNumber = snapshotsMissing.shift();

      // Snapshot balance
      balanceSnapshots[`${blockSnapshotNumber}`] = _.cloneDeep(blockchainState);
    }

    // Update balance
    blockchainState[from] -= value;
    if (blockchainState[from] === 0) {
      delete blockchainState[from];
    }
    if (blockchainState[to] === undefined) {
      blockchainState[to] = 0;
    }
    blockchainState[to] += value;
  }

  // Create snapshot for any block numbers left
  if (snapshotsMissing.length > 0) {
    snapshotsMissing.forEach((blockSnapshotNumber) => {
      balanceSnapshots[`${blockSnapshotNumber}`] = _.cloneDeep(blockchainState);
    })
  }

  return balanceSnapshots;
};
