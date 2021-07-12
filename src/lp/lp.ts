import lpAbiJson from "../../contracts/abi/lp-agix-eth.json";
import { AGIX_ETH_PAIR_CONTRACT_ADDRESS, BURN_ADDRESS } from "../constants";
import _ from "lodash";
import Web3 from "web3";
import { LP_STARTING_BLOCK } from "../parameters";
import { getJson, setJson } from "../helpers/cache-helper";
import { BalanceSnapshots, Snapshot } from "../types";

export const getLpSnapshots = async (web3: Web3, blockNumbers: number[]) => {
  /**
   * Creates object to hold the snapshots and sets up the contract
   */
  const balanceSnapshots: BalanceSnapshots = {};

  const contract = new web3.eth.Contract(
    lpAbiJson as any,
    AGIX_ETH_PAIR_CONTRACT_ADDRESS
  );

  /**
   * Loads the history of mint and burn events since the contract was created
   * And stores the events in the local cache
   * If the script it's run again, the local cache it's used instead of the asking for the events again
   */

  const cachedEvents = getJson("agix_lp", "events");
  let events = cachedEvents;

  if (!cachedEvents) {
    events = {
      mintEvents: await contract.getPastEvents("Mint", {
        fromBlock: LP_STARTING_BLOCK,
      }),
      burnEvents: await contract.getPastEvents("Burn", {
        fromBlock: LP_STARTING_BLOCK,
      }),
      allTransferEvents: await contract.getPastEvents("Transfer", {
        fromBlock: LP_STARTING_BLOCK
      })
    };
    // Doesn't include minting and burning transactions
    events.transferEvents = events.allTransferEvents.filter((event: any) => ![event.returnValues.from,event.returnValues.to].includes(BURN_ADDRESS))
    setJson("agix_lp", "events", JSON.stringify(events, null, 4));
  }

  /**
   * Does the same as above, but for a map between transaction hashes and senders, with the following form
   * {
   *    transaction_hash => sender
   * }
   * This is needed because the events above don't contain the original sender of the full transaction, just the interaction between the
   * Uniswap V2 Router and the LP pair contract
   *
   * Note: all requests are queued at once to shorten the loading time
   * For subsequent requests, the map would be stored locally, to avoid the large number of requests
   */

  // Merge events and sort them by block number
  const allEvents = _.orderBy(
    [...events.mintEvents, ...events.burnEvents, ...events.transferEvents],
    ["blockNumber"],
    ["asc"]
  );

  const cachedTransactionSenders = getJson("agix_lp", "transaction_senders");
  let transactionSendersMap: { [transactionHash: string]: string } =
    cachedTransactionSenders;

  if (!cachedTransactionSenders) {
    // This is the highest block requested
    // Needed to avoid requesting transaction that happen after that
    // Add one to the block number so the simulation below takes care of setting the snapshot
    const latestBlockRequested = Math.max(...blockNumbers) + 1;

    // Queue all requests
    const requestsPromises = allEvents
      .filter((event) => event.blockNumber <= latestBlockRequested)
      .map((contractEvent: any) => {
        const { transactionHash } = contractEvent;

        return web3.eth.getTransaction(transactionHash);
      });

    // Wait for all requests to finish
    await Promise.all(requestsPromises).then((transactionsRes) => {
      // Initialize map
      transactionSendersMap = {};

      // Populate with responses
      transactionsRes.forEach((transaction) => {
        const { from, hash } = transaction;

        transactionSendersMap[hash] = from;
      });

      // Store map in the cache
      setJson(
        "agix_lp",
        "transaction_senders",
        JSON.stringify(transactionSendersMap, null, 4)
      );
    });
  }

  /**
   * --- BLOCKCHAIN REPLAY/SIMULATION ---
   *
   * 1. Create an object that keeps track of a map of addresses to balances
   * This represents the blockchain
   * {
   *  address: {
   *    agix => balance
   *    eth => balance
   *  }
   * }
   *
   * 2. Go through all the events, modifying the balances accordingly
   * - Mint event means that LP token was minted, which increases the balance
   * - Burn event means that LP token was burned, which decreases the balance
   *
   * Note: before starting the simulation, both lists are combined and sorted by block number
   * This is done above
   *
   * 3. While we go through the events, see when the desired block numbers are reached or passed.
   * Once this happens, save the current blockchain state (the object).
   */

  // Step 1
  const blockchainState: { [address: string]: { agix: number; eth: number; lp: number } } =
    {};

  // Step 2

  // Get a copy of the desired blocks
  const snapshotsMissing: number[] = blockNumbers.slice();

  for (const contractEvent of allEvents) {
    // No more snapshots to take, break out of the loop
    if (snapshotsMissing.length === 0) {
      break;
    }

    // Use transaction to sender map
    const sender = transactionSendersMap[contractEvent.transactionHash];

    if (!sender) {
      continue;
    }

    const blockNumber = contractEvent.blockNumber;
    const { amount0, amount1 } = contractEvent.returnValues;
    const agix = Number(amount0);
    const eth = Number(amount1);

    // Step 3

    // See if a desired block was already passed
    if (snapshotsMissing[0] < blockNumber) {
      // Remove first snapshot number
      const blockSnapshotNumber = snapshotsMissing.shift();

      // Only snapshot AGIX balances, ignore ETH
      balanceSnapshots[`${blockSnapshotNumber}`] = _.entries(
        blockchainState
      ).reduce((prev, [address, liquidity]) => {
        const next = {
          ...prev,
        };
        next[address] = liquidity.agix;
        return next;
      }, {} as Snapshot);
    }

    // Update balance
    if (!blockchainState[sender]) {
      blockchainState[sender] = { agix: 0, eth: 0, lp: 0 };
    }
    const transferEvents = events.allTransferEvents.filter((event: any) => event.transactionHash === contractEvent.transactionHash)
    switch (contractEvent.event) {
      case "Mint":
        if (transferEvents.length > 0) {
          const mintTransferEvent = transferEvents.find((event: any) => event.returnValues.to === sender && event.returnValues.from === BURN_ADDRESS)
          if (mintTransferEvent) {
            // Mint
            blockchainState[sender].agix += agix;
            blockchainState[sender].eth += eth;
            blockchainState[sender].lp += Number(mintTransferEvent.returnValues.value) / (10 ** 18)
          }
        }
        break;
      case "Burn":
        if (transferEvents.length > 0) {
          const burnTransferEvent = transferEvents.find((event: any) => event.returnValues.from === sender && event.returnValues.to === BURN_ADDRESS)
          if (burnTransferEvent) {
            // Burn
            blockchainState[sender].agix -= agix;
            blockchainState[sender].eth -= eth;
            blockchainState[sender].lp -= Number(burnTransferEvent.returnValues.value) / (10 ** 18)
          }
        }
        break;
      case "Transfer":
        // LP token transfer
        if (blockchainState[sender].lp > 0) {
          // If the account had LP tokens
          const percentageRemoved = blockchainState[sender].lp / (Number(contractEvent.returnValues.value) / (10 ** 18))
          blockchainState[sender].agix -= (blockchainState[sender].agix * percentageRemoved);
          blockchainState[sender].eth -= (blockchainState[sender].eth * percentageRemoved);
          blockchainState[sender].lp *= (1 - percentageRemoved)
        }
        break;
    }
  }

  return balanceSnapshots;
};
