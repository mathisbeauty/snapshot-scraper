import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { post } from "../helpers/api-helper";
import { AGI_STAKING_CONTRACT_ADDRESS } from "../constants";
import agiAbi from "../../contracts/abi/stakers-agi.json";
import { BalanceSnapshots } from "../types";

const abiAndAddress = {
  contractAddress: AGI_STAKING_CONTRACT_ADDRESS,
  abi: agiAbi,
};

const { abi, contractAddress } = abiAndAddress;

export const getStakers = (stakeMapIndex: number, blockNumber?: number) => {
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "getStakeHolders"
  ) as any;
  const outputAbi = functionAbi && functionAbi.outputs;
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
      `${stakeMapIndex}`,
    ]);
    return post(contractAddress, functionCall, blockNumber).then((response) => {
      if (response) {
        const stakers = web3.eth.abi.decodeParameters(
          outputAbi,
          response.data.result as string
        )["0"] as string[];
        return stakers;
      }
      return null;
    });
  }
};

export const getStakeInfo = (
  stakeMapIndex: number,
  address: string,
  blockNumber?: number
) => {
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "getStakeInfo"
  ) as any;
  const outputAbi = functionAbi && functionAbi.outputs;
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
      `${stakeMapIndex}`,
      address,
    ]);
    return post(contractAddress, functionCall, blockNumber).then((response) => {
      if (response) {
        const stakeInfo = web3.eth.abi.decodeParameters(
          outputAbi,
          response.data.result as string
        );
        return stakeInfo;
      }
      return null;
    });
  }
};

/**
 * Get stakers snapshots from old staking contract, by staking period index (index 0 it's not used, start at 1)
 * @param stakingPeriodIndexes
 * @param blockNumber
 * @returns
 */
export const getStakersSnapshots = async (
  stakingPeriodIndexes: number[],
  blockNumber?: number
) => {
  const balanceSnapshots: BalanceSnapshots = {};

  for (const stakeMapIndex of stakingPeriodIndexes) {
    const stakers = await getStakers(stakeMapIndex, blockNumber);
    balanceSnapshots[stakeMapIndex] = {};
    console.log(`Staking period #${stakeMapIndex}`);

    if (stakers) {
      for (const [i, address] of stakers.entries()) {
        console.log(`Staker ${i + 1} of ${stakers.length}`);
        const stakerInfo = await getStakeInfo(
          stakeMapIndex,
          address,
          blockNumber
        );

        if (stakerInfo) {
          const stakerBalance = Number(stakerInfo.approvedAmount);
          if (stakerBalance >= 10 ** 11) {
            balanceSnapshots[stakeMapIndex][address] = stakerBalance;
          }
        }
      }
    }
  }

  return balanceSnapshots;
};
