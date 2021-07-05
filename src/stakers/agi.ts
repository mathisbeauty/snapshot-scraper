import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import { AGI_STAKING_CONTRACT_ADDRESS } from "../constants";
import agiAbi from "../../contracts/abi/stakers-agi.json";
import { BalanceSnapshots, Snapshot } from "../types";
import { AGI_STAKE_STARTING_BLOCK } from "../parameters";
import { getJson, setJson } from "../helpers/cache-helper";
import _, { keys } from "lodash";

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

  const events: { [key: string]: EventData[] } = cachedEvents || {
    submitStakeEvents: await getEvents("SubmitStake"),
    autoRenewStakeEvents: await getEvents("AutoRenewStake"),
    renewStakeEvents: await getEvents("RenewStake"),
    rejectStakeEvents: await getEvents("RejectStake"),
    claimStakeEvents: await getEvents("ClaimStake"),
    approveStakeEvents: await getEvents("ApproveStake"),
    withdrawStakeEvents: await getEvents("WithdrawStake"),
  };

  if (!cachedEvents) {
    setJson("agi_stake", "events", JSON.stringify(events, null, 4));
  }

  const latestStakingPeriod = Math.max(...stakingPeriodIndexes);

  for (let i = 1; i <= latestStakingPeriod; i++) {
    tempBalanceSnapshots[`${i}`] = {};
  }

  events.submitStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) + Number(stakeAmount);
  });

  events.rejectStakeEvents.map((event) => {
    const { stakeIndex, staker, returnAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(returnAmount);
  });

  [...events.autoRenewStakeEvents, ...events.renewStakeEvents].map((event) => {
    const {
      newStakeIndex: stakeIndex,
      staker,
      approvedAmount,
      returnAmount,
    } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) +
      Number(approvedAmount) -
      Number(returnAmount);
  });

  events.claimStakeEvents.map((event) => {
    const { stakeIndex, staker, rewardAmount, totalAmount } =
      event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) +
      (Number(totalAmount) - Number(rewardAmount));
  });

  events.approveStakeEvents.map((event) => {
    const { stakeIndex, staker, returnAmount } = event.returnValues;
    if (Number(stakeIndex) > latestStakingPeriod) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) + Number(returnAmount);
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
    if (stakingPeriodIndexes.includes(Number(index))) {
      balanceSnapshots[index] = _.cloneDeep(currentState);
    }
  });

  return balanceSnapshots;
};
