import Web3 from "web3";
import _ from "lodash";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "../constants";
import { getJson, setJson } from "../helpers/cache-helper";
import { BalanceSnapshots } from "../types";
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

  // Two steps, get all current holders and the approved
  const cachedStakeHolders = getJson("agix_stake", "stake_holders");
  let stakeHolders: string[] = [];
  if (!cachedStakeHolders) {
    stakeHolders = await contract.methods.getStakeHolders().call();
    setJson(
      "agix_stake",
      "stake_holders",
      JSON.stringify(stakeHolders, null, 4)
    );
  } else {
    stakeHolders = cachedStakeHolders;
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
    for (const stakingPeriodIndex of stakingPeriodIndexes) {
      stakeInfo[stakingPeriodIndex] = {};
      const stakeInfoPromises = stakeHolders.map((stakeHolder) =>
        contract.methods.getStakeInfo(stakingPeriodIndexes, stakeHolder).call()
      );
      await Promise.all(stakeInfoPromises).then((responses) => {
        responses.forEach((res, index) => {
          if (res) {
            stakeInfo[stakingPeriodIndex][stakeHolders[index]] = {
              found: res.found,
              approvedAmount: Number(res.approvedAmount),
              pendingForApprovalAmount: Number(res.pendingForApprovalAmount),
              rewardComputeIndex: res.rewardComputeIndex,
              claimableAmount: Number(res.claimableAmount),
            };
          }
        });
      });
    }
    setJson("agix_stake", "stake_info", JSON.stringify(stakeInfo, null, 4));
  } else {
    stakeInfo = cachedStakeInfo;
  }


  for (const stakingPeriodIndex of stakingPeriodIndexes) {
    for (const stakeHolder of stakeHolders) {
      const { approvedAmount, claimableAmount } = stakeInfo[stakingPeriodIndex][stakeHolder];
      balanceSnapshots[stakingPeriodIndex][stakeHolder] = approvedAmount + claimableAmount;
    }
  }

  // Print the total sum of the AGIX tokens for each staking period
  console.log(
    _.entries(balanceSnapshots).map(
      (e) => _.values(e[1]).reduce((p, c) => p + c, 0) / 10 ** 8
    )
  );

  return balanceSnapshots;
};
