import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import { AGI_STAKING_CONTRACT_ADDRESS } from "../constants";
import agiAbi from "../../contracts/abi/stakers-agi.json";
import { BalanceSnapshots, Snapshot } from "../types";
import { AGI_STAKE_STARTING_BLOCK } from "../parameters";
import { getJson, setJson } from "../helpers/cache-helper";
import _ from "lodash";

const abiAndAddress = {
  contractAddress: AGI_STAKING_CONTRACT_ADDRESS,
  abi: agiAbi as any,
};

const { abi, contractAddress } = abiAndAddress;

export const getAgiStakeSnapshots = async (
  web3: Web3,
  stakingPeriodIndexes: number[]
): Promise<BalanceSnapshots> => {
  const balanceSnapshots: BalanceSnapshots = {};
  const tempBalanceSnapshots: BalanceSnapshots = {};

  const contract = new web3.eth.Contract(abi, contractAddress);

  const getEvents = async (name: string) =>
    await contract.getPastEvents(name, {
      fromBlock: AGI_STAKE_STARTING_BLOCK,
    });

  const cachedEvents = getJson("agi_stake", "events");
  const cachedStakeHolders = getJson("agi_stake", "stake_holders");

  const events: { [key: string]: EventData[] } = cachedEvents || {
    submitStakeEvents: await getEvents("SubmitStake"),
    autoRenewStakeEvents: await getEvents("AutoRenewStake"),
    claimStakeEvents: await getEvents("ClaimStake"),
    approveStakeEvents: await getEvents("ApproveStake"),
    withdrawStakeEvents: await getEvents("WithdrawStake"),
    // Empty events, never happened
    renewStakeEvents: await getEvents("RenewStake"),
    rejectStakeEvents: await getEvents("RejectStake"),
  };

  if (!cachedEvents) {
    setJson("agi_stake", "events", JSON.stringify(events, null, 4));
  }

  const latestStakingPeriod = Math.max(...stakingPeriodIndexes);

  const stakeHolders: { [stakePeriodIndex: string]: string[] } =
    cachedStakeHolders || {};

  for (let i = 1; i <= latestStakingPeriod; i++) {
    tempBalanceSnapshots[`${i}`] = {};
    if (!cachedStakeHolders) {
      stakeHolders[`${i}`] = await contract.methods.getStakeHolders(i).call();
    }
  }

  if (!cachedStakeHolders) {
    setJson(
      "agi_stake",
      "stake_holders",
      JSON.stringify(stakeHolders, null, 4)
    );
  }

  const cachedStakeInfo = getJson("agi_stake", "stake_info");

  const stakeInfo: {
    [stakePeriodIndex: string]: {
      [staker: string]: {
        pendingForApprovalAmount: string;
        approvedAmount: string;
      };
    };
  } = cachedStakeInfo || {};

  if (!cachedStakeInfo) {
    for (const [period, stakeHoldersAddresses] of _.entries(stakeHolders)) {
      console.log(
        `Retrieving staking period ${period} of ${stakingPeriodIndexes.length}`
      );
      if (!stakeInfo[period]) {
        stakeInfo[period] = {};
      }
      const resultsPromises = stakeHoldersAddresses.map((address) =>
        contract.methods
          .getStakeInfo(period, address)
          .call()
          .then((result: any) => ({ result, address }))
      );
      await Promise.all(resultsPromises).then(
        (responses: { result: any; address: string }[]) => {
          responses.forEach((res) => {
            if (res && res.result.found) {
              stakeInfo[period][res.address] = {
                pendingForApprovalAmount: res.result.pendingForApprovalAmount,
                approvedAmount: res.result.approvedAmount,
              };
            }
          });
        }
      );
    }
    setJson("agi_stake", "stake_info", JSON.stringify(stakeInfo, null, 4));
  }

  events.autoRenewStakeEvents.map((event) => {
    const {
      newStakeIndex: stakeIndex,
      staker,
      stakeAmount,
    } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] = Number(stakeAmount);
  });

  events.submitStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) + Number(stakeAmount);
  });

  events.claimStakeEvents.map((event) => {
    const { stakeIndex, staker, totalAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(totalAmount);
  });

  events.approveStakeEvents.map((event) => {
    const { stakeIndex, staker, returnAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(returnAmount);
  });

  events.withdrawStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(stakeAmount);
  });

  let currentState: Snapshot = {};

  _.entries(tempBalanceSnapshots).forEach(([index, curr]) => {
    currentState = { ...currentState, ...curr };
    // _.keys(currentState).forEach((staker) => {
    //   if (!stakeHolders[index].includes(staker)) {
    //     delete currentState[staker];
    //   }
    // });
    // Update last snapshot to match the available stake info
    if (index === "14") {
      balanceSnapshots[index] = _.cloneDeep(currentState);
      balanceSnapshots[index] = {
        ...balanceSnapshots[index],
        ..._.keys(balanceSnapshots[index]).reduce((prev, address) => {
          const next: any = {
            ...prev,
          };
          if (stakeInfo[14][address]) {
            next[address as string] = Number(
              stakeInfo[14][address].approvedAmount
            );
          }
          return next;
        }, {}),
      };
    } else {
      balanceSnapshots[index] = _.cloneDeep(currentState);
    }
    // if (stakingPeriodIndexes.includes(Number(index))) {
    // }
  });

  // Print the total sum of the AGI tokens for each staking period
  console.log(
    _.entries(balanceSnapshots).map(
      (e) => _.values(e[1]).reduce((p, c) => p + c, 0) / 10 ** 8
    )
  );

  return balanceSnapshots;
};
