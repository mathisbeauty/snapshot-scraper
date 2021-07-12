import Web3 from "web3";
import { EventData } from "web3-eth-contract";
import _ from "lodash";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "../constants";
import { getJson, loadSnapshot, setJson } from "../helpers/cache-helper";
import { AGIX_STAKE_STARTING_BLOCK } from "../parameters";
import { BalanceSnapshots, Snapshot } from "../types";
import agixAbi from "../../contracts/abi/stakers-agix.json";

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

  stakingPeriodIndexes.forEach((i) => {
    balanceSnapshots[`${i}`] = {};
  });

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

  // Load previous balances from the previous contract, to account for the migration
  const snapshot14 = loadSnapshot("agi_stake", "14");

  if (!snapshot14) {
    console.error(
      "Scrape previous smart contract to populate the new contract's balances"
    );
    process.exit(1);
  }

  const tempBalanceSnapshots = _.cloneDeep(balanceSnapshots);

  events.submitStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) + Number(stakeAmount);
  });

  events.rejectStakeEvents.map((event) => {
    const { stakeIndex, staker, returnAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(returnAmount);
  });

  events.withdrawStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(stakeAmount);
  });

  events.claimStakeEvents.map((event) => {
    const { stakeIndex, staker, stakeAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) - Number(stakeAmount);
  });

  events.addRewardEvents.map((event) => {
    const { stakeIndex, staker, rewardAmount } = event.returnValues;
    if (!stakingPeriodIndexes.includes(Number(stakeIndex))) {
      return;
    }
    tempBalanceSnapshots[stakeIndex][staker] =
      (tempBalanceSnapshots[stakeIndex][staker] || 0) + Number(rewardAmount);
  });

  // Use last snapshot as a starting point (a.k.a. account for the AGI to AGIX migration)
  // Two steps, get all current holders and the approved
  const cachedStakeHolders15 = getJson("agix_stake", "stake_holders_15");
  let stakeHolders15: string[] = [];
  if (!cachedStakeHolders15) {
    stakeHolders15 = await contract.methods.getStakeHolders().call();
    setJson(
      "agix_stake",
      "stake_holders_15",
      JSON.stringify(stakeHolders15, null, 4)
    );
  } else {
    stakeHolders15 = cachedStakeHolders15;
  }

  const cachedStakeInfo = getJson("agix_stake", "stake_info_15");
  let stakeInfo: {
    [stakePeriodIndex: number]: {
      [address: string]: {
        found: boolean;
        approvedAmount: number;
        pendingForApprovalAmount: number;
        rewardComputeIndex: string;
        claimableAmount: number;
      };
    };
  } = {};
  if (!cachedStakeInfo) {
    stakeInfo[15] = {};
    const stakeHolders = _.keys(tempBalanceSnapshots["15"]);
    const stakeInfoPromises = stakeHolders.map((stakeHolder) =>
      contract.methods.getStakeInfo(15, stakeHolder).call()
    );
    await Promise.all(stakeInfoPromises).then((responses) => {
      responses.forEach((res, index) => {
        if (res) {
          stakeInfo[15][stakeHolders[index]] = {
            found: res.found,
            approvedAmount: Number(res.approvedAmount),
            pendingForApprovalAmount: Number(res.pendingForApprovalAmount),
            rewardComputeIndex: res.rewardComputeIndex,
            claimableAmount: Number(res.claimableAmount),
          };
        }
      });
    });
    setJson("agix_stake", "stake_info_15", JSON.stringify(stakeInfo, null, 4));
  } else {
    stakeInfo = cachedStakeInfo;
  }

  tempBalanceSnapshots[15] = _.reduce(
    _.entries(tempBalanceSnapshots[15]),
    (prev, [address, balance]) => {
      const next = {
        ...prev,
      };

      const stakerInfo = stakeInfo[15][address];
      const scrapedBalance = stakerInfo
        ? stakerInfo.approvedAmount
        : snapshot14[address];
      if (stakeHolders15.includes(address)) {
        if (scrapedBalance !== undefined) {
          next[address] = (scrapedBalance || 0) + (balance || 0);
        } else {
          next[address] = balance;
        }
      }
      return next;
    },
    {} as Snapshot
  );

  // Print the total sum of the AGIX tokens for each staking period
  // console.log(
  //   _.entries(tempBalanceSnapshots).map(
  //     (e) => _.values(e[1]).reduce((p, c) => p + c, 0) / 10 ** 8
  //   )
  // );

  return tempBalanceSnapshots;
};
