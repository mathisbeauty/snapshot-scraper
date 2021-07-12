import _ from "lodash";
import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import agixAbiJson from "../../contracts/abi/holders-agix.json";
import {
  AGIX_TOKEN_CONTRACT_ADDRESS,
  AGI_TOKEN_CONTRACT_ADDRESS,
  AGI_TOKEN_CONTRACT_DEPLOYER,
  AGI_TOTAL_SUPPLY,
  BURN_ADDRESS,
} from "../constants";
import { getJson, setJson } from "../helpers/cache-helper";
import {
  AGIX_FIRST_BLOCK,
  AGIX_FIRST_SNAPSHOT_BLOCK,
  AGIX_SNAPSHOT_INTERVAL,
  AGIX_SCRAPING_STEP_SIZE,
  AGI_AGIX_SNAPSHOT_RANDOM_SPREAD,
} from "../parameters";
import { BalanceSnapshots } from "../types";

export const getAgixHoldersSnapshots = async (web3: Web3) => {
  const balanceSnapshots: BalanceSnapshots = {};

  // Use current block for the latest snapshot
  const lastBlockNumber = await web3.eth.getBlockNumber();

  const snapshotBlocks = [AGIX_FIRST_SNAPSHOT_BLOCK];

  let nextSnapshotBlock = AGIX_FIRST_SNAPSHOT_BLOCK;
  do {
    nextSnapshotBlock += AGIX_SNAPSHOT_INTERVAL + Math.floor((Math.random() * 2 - 1) * AGI_AGIX_SNAPSHOT_RANDOM_SPREAD);
    if (nextSnapshotBlock < lastBlockNumber) {
      snapshotBlocks.push(nextSnapshotBlock);
    }
  } while (nextSnapshotBlock < lastBlockNumber);

  snapshotBlocks.push(lastBlockNumber);

  const contract = new web3.eth.Contract(
    agixAbiJson as any,
    AGIX_TOKEN_CONTRACT_ADDRESS
  );

  const cachedEvents = getJson("agix_holders", "events");

  let events = cachedEvents;

  if (!cachedEvents) {
    events = [];
    const stepSize = AGIX_SCRAPING_STEP_SIZE;

    const totalBlocks = lastBlockNumber - AGIX_FIRST_BLOCK;

    const totalSteps = Math.ceil(totalBlocks / stepSize);

    for (let i = 0; i <= totalSteps; i++) {
      console.log(`Step ${i} of ${totalSteps}`);
      const offset = i * stepSize;
      const offsetLast = (i + 1) * stepSize;
      const fromBlock = AGIX_FIRST_BLOCK + offset;
      let toBlock = AGIX_FIRST_BLOCK + offsetLast - 1;
      if (toBlock > lastBlockNumber) {
        toBlock = lastBlockNumber;
      }
      const response = await contract.getPastEvents("Transfer", {
        fromBlock,
        toBlock,
      });
      console.log(`Requested from block ${fromBlock} to ${toBlock}`);
      if (response && response.length > 0) {
        events.push(...response);
        // setJson(
        //   "agix_holders",
        //   `${i}--${fromBlock}-${toBlock}`,
        //   JSON.stringify(response, null, 4)
        // );
      }
    }
    setJson("agix_holders", "events", JSON.stringify(events, null, 4));
  }

  // Set deployed state
  const blockchainState: { [address: string]: number } = {};

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
    const isZeroAddress = from === BURN_ADDRESS;

    // Step 3

    // See if a desired block was already passed
    if (snapshotsMissing[0] < blockNumber) {
      // Remove first snapshot number
      const blockSnapshotNumber = snapshotsMissing.shift();

      // Snapshot balance
      balanceSnapshots[`${blockSnapshotNumber}`] = _.cloneDeep(blockchainState);
    }

    // Update balance
    if (!isZeroAddress) {
      blockchainState[from] -= value;
    }
    if (!isZeroAddress && blockchainState[from] === 0) {
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
