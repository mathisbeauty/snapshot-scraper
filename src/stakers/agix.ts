import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { post } from "../helpers/api-helper";
import agixAbi from "../../contracts/abi/stakers-agix.json";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "../constants";
import { BalanceSnapshots } from "../types";

const abiAndAddress = {
  contractAddress: AGIX_STAKING_CONTRACT_ADDRESS,
  abi: agixAbi,
};

const getStakerBalance = (
  address: string,
  blockNumber?: number
): Promise<number | null> | null => {
  const { abi, contractAddress } = abiAndAddress;
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "balances"
  ) as any;
  const outputAbi = functionAbi && functionAbi.outputs;
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
      address,
    ]);
    return post(contractAddress, functionCall, blockNumber).then((response) => {
      if (response) {
        const stakerBalance = web3.eth.abi.decodeParameters(
          outputAbi,
          response.data.result as string
        )["0"] as any;
        return Number(stakerBalance);
      }
      return null;
    });
  } else {
    return null;
  }
};

const getAllStakers = (
  blockNumber?: number
): Promise<string[] | null> | null => {
  const { abi, contractAddress } = abiAndAddress;
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "getStakeHolders"
  ) as any;
  const outputAbi =
    functionAbi && functionAbi.outputs && functionAbi.outputs[0];
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    // AGIX
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, []);
    return post(contractAddress, functionCall, blockNumber).then((response) => {
      if (response) {
        return web3.eth.abi.decodeParameters(
          [outputAbi],
          response.data.result as string
        )["0"];
      }
      return null;
    });
  }
  return null;
};

/**
 * Get stakers snapshots, by block number
 * @param blockNumbers 0 = latest
 */
export const getStakersSnapshots = async (
  blockNumbers: number[]
): Promise<BalanceSnapshots> => {
  const balanceSnapshots: BalanceSnapshots = {};

  for (const blockNumber of blockNumbers) {
    const stakers = await getAllStakers(blockNumber);
    balanceSnapshots[blockNumber] = {};

    if (stakers) {
      for (const address of stakers) {
        const stakerBalance = await getStakerBalance(address, blockNumber);
        if (stakerBalance) {
          balanceSnapshots[blockNumber][address] = stakerBalance;
        }
        break;
      }
    }
  }

  return balanceSnapshots;
};
