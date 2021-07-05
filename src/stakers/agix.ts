import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import agixAbi from "../../contracts/abi/stakers-agix.json";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "../constants";
import { getJson, setJson } from "../helpers/cache-helper";
import { AGIX_STAKE_STARTING_BLOCK } from "../parameters";
import { BalanceSnapshots } from "../types";

const abiAndAddress = {
  contractAddress: AGIX_STAKING_CONTRACT_ADDRESS,
  abi: agixAbi as any,
};

const { abi, contractAddress } = abiAndAddress;

export const getAgixStakeSnapshots = async (
  web3: Web3,
  stakingPeriodIndexes: number[]
): Promise<BalanceSnapshots> => {
  const balanceSnapshots: BalanceSnapshots = {};

  const contract = new web3.eth.Contract(abi, contractAddress);

  const getEvents = async (name: string) =>
    await contract.getPastEvents(name, {
      fromBlock: AGIX_STAKE_STARTING_BLOCK,
    });

  const cachedEvents = getJson("agix_stake", "events");

  const events: { [key: string]: EventData[] } = cachedEvents || {
    submitStakeEvents: await getEvents("SubmitStake"),
    withdrawStakeEvents: await getEvents("WithdrawStake"),
    claimStakeEvents: await getEvents("ClaimStake"),
    rejectStakeEvents: await getEvents("RejectStake"),
    addRewardEvents: await getEvents("AddReward"),
  };

  if (!cachedEvents) {
    setJson("agix_stake", "events", JSON.stringify(events, null, 4));
  }

  stakingPeriodIndexes.forEach((i) => {
    balanceSnapshots[`${i}`] = {};
  });

  events.submitStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    balanceSnapshots[stakeIndex][staker] =
      (balanceSnapshots[stakeIndex][staker] || 0) + Number(stakeAmount);
  });

  events.withdrawStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    balanceSnapshots[stakeIndex][staker] =
      (balanceSnapshots[stakeIndex][staker] || 0) - Number(stakeAmount);
  });

  events.claimStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    balanceSnapshots[stakeIndex][staker] =
      (balanceSnapshots[stakeIndex][staker] || 0) - Number(stakeAmount);
  });

  events.addRewardEvents.map((event) => {
    const { stakeIndex, staker, rewardAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    balanceSnapshots[stakeIndex][staker] =
      (balanceSnapshots[stakeIndex][staker] || 0) + Number(rewardAmount);
  });

  return balanceSnapshots;
};
