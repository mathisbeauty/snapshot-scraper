import Web3 from "web3";
import { AbiItem } from "web3-utils";
import agiAbi from "../contracts/abi/stakers-agi.json";
import agixAbi from "../contracts/abi/stakers-agix.json";
import { post } from "./helpers/api-helper";
import {
  AGIX_STAKING_CONTRACT_ADDRESS,
  AGI_STAKING_CONTRACT_ADDRESS,
} from "./constants";
import { BalanceSnapshots } from "./types";

const BLOCK_NUMBER_SWAP_THRESHOLD = -1;

const getAbiAndAddress = (
  blockNumber?: number
): { contractAddress: string; abi: any[] } =>
  // blockNumber && blockNumber >= BLOCK_NUMBER_SWAP_THRESHOLD
  false
    ? { contractAddress: AGIX_STAKING_CONTRACT_ADDRESS, abi: agixAbi }
    : { contractAddress: AGI_STAKING_CONTRACT_ADDRESS, abi: agiAbi };

const getStakerBalance = (
  address: string,
  blockNumber?: number
): Promise<number | null> | null => {
  const { abi, contractAddress } = getAbiAndAddress(blockNumber);
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
  const { abi, contractAddress } = getAbiAndAddress(blockNumber);
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "getStakeHolders"
  ) as any;
  const outputAbi =
    functionAbi && functionAbi.outputs && functionAbi.outputs[0];
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    if (contractAddress === AGI_STAKING_CONTRACT_ADDRESS) {
      // AGI (old)
      const currentStakeMapIndexAbi: AbiItem = abi.find(
        (func) => func.name === "currentStakeMapIndex"
      ) as any;
      const currentStakeMapIndexFunction = web3.eth.abi.encodeFunctionCall(
        currentStakeMapIndexAbi,
        []
      );
      const currentStakeMapIndexPromise = post(
        contractAddress,
        currentStakeMapIndexFunction,
        blockNumber
      );
      return currentStakeMapIndexPromise.then((currentStakeMapIndexRes) => {
        const currentStakeMapIndex = Number(
          web3.eth.abi.decodeParameters(
            [
              {
                name: "",
                type: "uint256",
              },
            ],
            currentStakeMapIndexRes?.data.result
          )["0"]
        );
        const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
          `${currentStakeMapIndex}`,
        ]);
        return post(contractAddress, functionCall, blockNumber).then(
          (response) => {
            if (response) {
              const stakers = web3.eth.abi.decodeParameters(
                [outputAbi],
                response.data.result as string
              )["0"];
              return stakers;
            }
            return null;
          }
        );
      });
    } else {
      // AGIX
      const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, []);
      return post(contractAddress, functionCall, blockNumber).then(
        (response) => {
          if (response) {
            return web3.eth.abi.decodeParameters(
              [outputAbi],
              response.data.result as string
            )["0"];
          }
          return null;
        }
      );
    }
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
